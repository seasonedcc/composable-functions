import {
  assertEquals,
  assertObjectMatch,
  describe,
  it,
} from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { mdf } from './constructor.ts'
import { fromSuccess, trace } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { makeErrorResult } from './errors.ts'

describe('trace', () => {
  it('converts trace exceptions to df failures', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = trace(() => {
      throw new Error('Problem in tracing')
    })(a)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    const result = await c({ id: 1 })

    assertObjectMatch(
      result,
      makeErrorResult({
        errors: [{ message: 'Problem in tracing' }],
      }),
    )
  })

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
