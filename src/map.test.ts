import { describe, it, assertEquals, assertObjectMatch } from './test-prelude.ts'
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import { mdf } from './constructor.ts'
import { map } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('map', () => {
  it('returns a domain function function that will apply a function over the results of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (id: number) => id + 1

    const c = map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: 3,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns the error when the domain function fails', async () => {
    const firstInputParser = z.object({ id: z.number() })
    const a = mdf(firstInputParser)(({ id }) => id + 1)
    const b = (id: number) => id + 1

    const c = map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ invalidInput: '1' }), {
      success: false,
      errors: [],
      inputErrors: [{ message: 'Required', path: ['id'] }],
      environmentErrors: [],
    })
  })

  it('returns the error when the mapping function fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => {
      throw new Error('failed to map')
    }

    const c = map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<never>>>

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'failed to map' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})
