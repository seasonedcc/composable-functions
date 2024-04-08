import { describe, it, assertEquals } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { makeSuccessResult, mdf } from './constructor.ts'
import { map } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { makeErrorResult } from './errors.ts'

describe('map', () => {
  it('returns a domain function function that will apply a function over the results of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (id: number) => id + 1

    const c = map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), makeSuccessResult(3))
  })

  it('returns a domain function function that will apply an async function over the results of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (id: number) => Promise.resolve(id + 1)

    const c = map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), makeSuccessResult(3))
  })

  it('returns the error when the domain function fails', async () => {
    const firstInputParser = z.object({ id: z.number() })
    const a = mdf(firstInputParser)(({ id }) => id + 1)
    const b = (id: number) => id + 1

    const c = map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      makeErrorResult({
        inputErrors: [{ message: 'Required', path: ['id'] }],
      }),
    )
  })

  it('returns the error when the mapping function fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => {
      throw 'failed to map'
    }

    const c = map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<never>>>

    assertEquals(
      await c({ id: 1 }),
      makeErrorResult({
        errors: [{ message: 'failed to map', exception: 'failed to map' }],
      }),
    )
  })
})
