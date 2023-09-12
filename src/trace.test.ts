import { describe, it, assertEquals } from './test-prelude.ts'
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import { mdf } from './constructor.ts'
import { fromSuccess, trace } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('trace', () => {
  it('intercepts inputs and outputs of a given domain function', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)

    let contextFromFunctionA: {
      input: unknown
      environment: unknown
      result: unknown
    } | null = null

    const c = trace((context) => {
      contextFromFunctionA = context
    })(a)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await fromSuccess(c)({ id: 1 }), 2)
    assertEquals(contextFromFunctionA, {
      input: { id: 1 },
      environment: undefined,
      result: {
        success: true,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
        data: 2,
      },
    })
  })
})
