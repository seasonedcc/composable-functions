import {
  assertEquals,
  assertIsError,
  describe,
  it,
  z,
} from '../../test-prelude.ts'
import { df, failure, InputError, success } from '../../index.ts'
import type { DomainFunction } from '../../index.ts'

describe('collect', () => {
  it('should combine an object of domain functions', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = df.make(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = df.collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: number }>>>

    assertEquals(await c({ id: 1 }), success({ a: 2, b: 0 }))
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id)
    const b = df.make(z.object({ id: z.string() }))(({ id }) => id)

    const c = df.collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: string }>>>

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected string, received number', ['id'])]),
    )
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id)
    const b = df.make(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c = df.collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: never }>>>

    assertEquals(await c({ id: 1 }), failure([new Error()]))
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = df.make(z.object({ id: z.string() }))(({ id }) => id)
    const b = df.make(z.object({ id: z.string() }))(({ id }) => id)

    const c = df.collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: string; b: string }>>>

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

    const c = df.collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: never; b: never }>>>

    const {
      errors: [errA, errB],
    } = await c({ id: 1 })
    assertIsError(errA, Error, 'Error A')
    assertIsError(errB, Error, 'Error B')
  })
})
