import { assertEquals, assertIsError, describe, it, z } from './prelude.ts'
import { merge, withSchema, failure, InputError, success } from '../index.ts'
import type { Composable } from '../index.ts'
import { composable } from '../index.ts'

describe('merge', () => {
  it('should combine two schema functions results into one object', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      resultA: id + 1,
    }))
    const b = composable(({ id }: { id: number }) => ({
      resultB: id - 1,
    }))

    const c = merge(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (
            input: { id: number },
            environment?: unknown,
          ) => { resultA: number; resultB: number }
        >
      >
    >

    assertEquals(await c({ id: 1 }), success({ resultA: 2, resultB: 0 }))
  })

  it('should combine many schema functions into one', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      resultA: String(id),
      resultB: String(id),
      resultC: String(id),
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      resultB: id + 1,
    }))
    const c = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      resultC: Boolean(id),
    }))
    const d = merge(a, b, c)
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (
            input?: unknown,
            environment?: unknown,
          ) => {
            resultA: string
            resultB: number
            resultC: boolean
          }
        >
      >
    >

    const results = await d({ id: 1 })
    assertEquals(results, success({ resultA: '1', resultB: 2, resultC: true }))
  })

  it('should return error when one of the schema functions has input errors', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id,
    }))
    const b = withSchema(z.object({ id: z.string() }))(({ id }) => ({
      id,
    }))

    const c: Composable<
      (input?: unknown, environment?: unknown) => { id: string }
    > = merge(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (
            input?: unknown,
            environment?: unknown,
          ) => {
            id: string
          }
        >
      >
    >

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected string, received number', ['id'])]),
    )
  })

  it('should return error when one of the schema functions fails', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id,
    }))
    const b = withSchema(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c: Composable<(input?: unknown, environment?: unknown) => never> =
      merge(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    assertEquals(await c({ id: 1 }), failure([new Error()]))
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = withSchema(z.object({ id: z.string() }))(({ id }) => ({
      resultA: id,
    }))
    const b = withSchema(z.object({ id: z.string() }))(({ id }) => ({
      resultB: id,
    }))

    const c = merge(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (
            input?: unknown,
            environment?: unknown,
          ) => { resultA: string; resultB: string }
        >
      >
    >

    assertEquals(
      await c({ id: 1 }),
      failure([
        new InputError('Expected string, received number', ['id']),
        new InputError('Expected string, received number', ['id']),
      ]),
    )
  })

  it('should combine the error messages when both functions fail', async () => {
    const a = withSchema(z.object({ id: z.number() }))(() => {
      throw new Error('Error A')
    })
    const b = withSchema(z.object({ id: z.number() }))(() => {
      throw new Error('Error B')
    })

    const c = merge(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    const {
      errors: [errA, errB],
    } = await c({ id: 1 })
    assertIsError(errA, Error, 'Error A')
    assertIsError(errB, Error, 'Error B')
  })
})
