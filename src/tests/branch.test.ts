import { assertEquals, assertIsError, describe, it, z } from './prelude.ts'
import {
  composable,
  failure,
  InputError,
  success,
  withSchema,
} from '../index.ts'
import { Composable } from '../types.ts'
import { branch } from '../combinators.ts'

describe('branch', () => {
  it('should pipe a composable with arbitrary types', async () => {
    const a = composable(({ id }: { id: number }) => ({
      id: id + 2,
    }))
    const b = composable(({ id }: { id: number }) => id - 1)

    const c = branch(a, (i: { id: number }) =>
      i.id % 2 === 0 ? Promise.resolve(b) : Promise.resolve(a),
    )
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input: { id: number }) => number | { id: number }>
      >
    >

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('should enable conditionally choosing the next Composable with the output of first one', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => String(id))
    const c = withSchema(z.object({ id: z.number() }))(({ id }) => id * 2)
    const d = branch(a, (output) => (output.next === 'multiply' ? c : b))
    type _R = Expect<
      Equal<
        typeof d,
        Composable<(input?: unknown, environment?: unknown) => number | string>
      >
    >

    assertEquals(await d({ id: 1 }), success(6))
  })

  it('should not pipe if the predicate returns null', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = composable(({ id }: { id: number }) => String(id))
    const d = branch(a, (output) => (output.next === 'multiply' ? null : b))
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (
            input?: unknown,
            environment?: unknown,
          ) => string | { id: number; next: string }
        >
      >
    >

    assertEquals(await d({ id: 1 }), success({ id: 3, next: 'multiply' }))
  })

  it('should gracefully fail if the first function fails', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = branch(a, (i: { id: number }) => b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(
      await c({ id: '1' }),
      failure([new InputError('Expected number, received string', ['id'])]),
    )
  })

  it('should gracefully fail if the second function fails', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: String(id),
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = branch(a, (i: { id: string }) => b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected number, received string', ['id'])]),
    )
  })

  it('should gracefully fail if the condition function fails', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = branch(a, (_) => {
      throw new Error('condition function failed')
      // deno-lint-ignore no-unreachable
      return b
    })
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    const {
      errors: [err],
    } = await c({ id: 1 })
    assertIsError(err, Error, 'condition function failed')
  })
})
