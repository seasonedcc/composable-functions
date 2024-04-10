import {
  assertEquals,
  assertIsError,
  describe,
  it,
  z,
} from '../../test-prelude.ts'
import { df, fromSuccess, success } from '../../index.ts'
import type { DomainFunction } from '../../index.ts'

describe('trace', () => {
  it('converts trace exceptions to df failures', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = df.trace(() => {
      throw new Error('Problem in tracing')
    })(a)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    const result = await c({ id: 1 })

    assertIsError(result.errors[0], Error, 'Problem in tracing')
  })

  it('intercepts inputs and outputs of a given domain function', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)

    let contextFromFunctionA: {
      input: unknown
      environment: unknown
      result: unknown
    } | null = null

    const c = df.trace((context) => {
      contextFromFunctionA = context
    })(a)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await fromSuccess(c)({ id: 1 }), 2)
    assertEquals(contextFromFunctionA, {
      input: { id: 1 },
      environment: undefined,
      result: success(2),
    })
  })
})
