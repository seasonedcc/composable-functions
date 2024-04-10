import { assertEquals, describe, it } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { success, mdf } from './constructor.ts'
import { mapError } from './domain-functions.ts'
import type { DomainFunction, Failure } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { failure } from './errors.ts'

describe('mapError', () => {
  it('returns the result when the domain function suceeds', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => [new Error('New Error Message')]

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('returns a domain function function that will apply a function over the error of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const errorMapper = (errors: Error[]) => [
      new Error('Number of errors: ' + errors.length),
    ]

    const c = mapError(a, errorMapper)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      failure([new Error('Number of errors: 1')]),
    )
  })

  it('returns a domain function function that will apply an async function over the error of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const errorMapper = (errors: Error[]) =>
      Promise.resolve([new Error('Number of errors: ' + errors.length)])

    const c = mapError(a, errorMapper)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      failure([new Error('Number of errors: 1')]),
    )
  })

  it('returns the error when the mapping function fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => {
      throw 'failed to map'
    }

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      failure([new Error('failed to map')]),
    )
  })
})
