import {
  assertEquals,
  assertIsError,
  describe,
  it,
  z,
} from '../../test-prelude.ts'
import { df, failure, InputError, success } from '../../index.ts'
import type { DomainFunction } from '../../index.ts'

describe('merge', () => {
  it('should combine two domain functions results into one object', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      resultA: id + 1,
    }))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => ({
      resultB: id - 1,
    }))

    const c = df.merge(a, b)
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ resultA: number; resultB: number }>>
    >

    assertEquals(await c({ id: 1 }), success({ resultA: 2, resultB: 0 }))
  })

  it('should combine many domain functions into one', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      resultA: String(id),
      resultB: String(id),
      resultC: String(id),
    }))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => ({
      resultB: id + 1,
    }))
    const c = df.make(z.object({ id: z.number() }))(({ id }) => ({
      resultC: Boolean(id),
    }))
    const d = df.merge(a, b, c)
    type _R = Expect<
      Equal<
        typeof d,
        DomainFunction<{
          resultA: string
          resultB: number
          resultC: boolean
        }>
      >
    >

    const results = await d({ id: 1 })
    assertEquals(results, success({ resultA: '1', resultB: 2, resultC: true }))
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      id,
    }))
    const b = df.make(z.object({ id: z.string() }))(({ id }) => ({
      id,
    }))

    const c: DomainFunction<{ id: string }> = df.merge(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        DomainFunction<{
          id: string
        }>
      >
    >

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected string, received number', ['id'])]),
    )
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      id,
    }))
    const b = df.make(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c: DomainFunction<never> = df.merge(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<never>>>

    assertEquals(await c({ id: 1 }), failure([new Error()]))
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = df.make(z.object({ id: z.string() }))(({ id }) => ({
      resultA: id,
    }))
    const b = df.make(z.object({ id: z.string() }))(({ id }) => ({
      resultB: id,
    }))

    const c = df.merge(a, b)
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ resultA: string; resultB: string }>>
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
    const a = df.make(z.object({ id: z.number() }))(() => {
      throw new Error('Error A')
    })
    const b = df.make(z.object({ id: z.number() }))(() => {
      throw new Error('Error B')
    })

    const c = df.merge(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<never>>>

    const {
      errors: [errA, errB],
    } = await c({ id: 1 })
    assertIsError(errA, Error, 'Error A')
    assertIsError(errB, Error, 'Error B')
  })
})
