import { describe, it, assertEquals, assertIsError } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { success, mdf } from './constructor.ts'
import { all } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { failure, InputError } from './errors.ts'

describe('all', () => {
  it('should combine two domain functions into one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, number]>>>

    assertEquals(await c({ id: 1 }), success<[number, number]>([2, 0]))
  })

  it('should combine many domain functions into one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => String(id))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const c = mdf(z.object({ id: z.number() }))(({ id }) => Boolean(id))
    const d = all(a, b, c)
    type _R = Expect<Equal<typeof d, DomainFunction<[string, number, boolean]>>>

    const results = await d({ id: 1 })
    assertEquals(results, success<[string, number, boolean]>(['1', 2, true]))
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, string]>>>

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected string, received number', ['id'])]),
    )
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, never]>>>

    assertEquals(await c({ id: 1 }), failure([new Error()]))
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = mdf(z.object({ id: z.string() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[string, string]>>>

    assertEquals(
      await c({ id: 1 }),
      failure([
        new InputError('Expected string, received number', ['id']),
        new InputError('Expected string, received number', ['id']),
      ]),
    )
  })

  it('should combine the error messages when both functions fail', async () => {
    const a = mdf(z.object({ id: z.number() }))(() => {
      throw new Error('Error A')
    })
    const b = mdf(z.object({ id: z.number() }))(() => {
      throw new Error('Error B')
    })

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[never, never]>>>

    const {
      errors: [errA, errB],
    } = await c({ id: 1 })
    assertIsError(errA, Error, 'Error A')
    assertIsError(errB, Error, 'Error B')
  })
})
