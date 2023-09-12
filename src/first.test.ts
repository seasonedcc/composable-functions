import { describe, it, assertEquals } from './test-prelude.ts'
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import { mdf } from './constructor.ts'
import { first } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('first', () => {
  it('should return the result of the first successful domain function', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => String(id))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const c = mdf(z.object({ id: z.number() }))(({ id }) => Boolean(id))
    const d = first(a, b, c)
    type _R = Expect<Equal<typeof d, DomainFunction<string | number | boolean>>>

    const results = await d({ id: 1 })
    assertEquals(results, {
      success: true,
      data: '1',
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should return a successful result even if one of the domain functions fails', async () => {
    const a = mdf(
      z.object({ n: z.number(), operation: z.literal('increment') }),
    )(({ n }) => n + 1)
    const b = mdf(
      z.object({ n: z.number(), operation: z.literal('decrement') }),
    )(({ n }) => n - 1)

    const c = first(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ n: 1, operation: 'increment' }), {
      success: true,
      data: 2,
      inputErrors: [],
      errors: [],
      environmentErrors: [],
    })
  })

  it('should return error when all of the domain functions fails', async () => {
    const a = mdf(z.object({ id: z.string() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c = first(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<string>>>

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      environmentErrors: [],
    })
  })
})
