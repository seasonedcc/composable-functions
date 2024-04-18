import {
  assertEquals,
  assertIsError,
  describe,
  it,
  z,
} from '../test-prelude.ts'
import { composable, df, trace, fromSuccess, success } from '../index.ts'
import type { Composable } from '../index.ts'

describe('trace', () => {
  it('converts trace exceptions to df failures', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = trace(() => {
      throw new Error('Problem in tracing')
    })(a)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    const result = await c({ id: 1 })

    assertIsError(result.errors[0], Error, 'Problem in tracing')
  })

  it('converts trace exceptions to df failures', async () => {
    const a = composable(({ id }: { id: number }) => id + 1)

    const c = trace(() => {
      throw new Error('Problem in tracing')
    })(a)
    type _R = Expect<
      Equal<typeof c, Composable<(args: { id: number }) => number>>
    >

    const result = await c({ id: 1 })

    assertIsError(result.errors[0], Error, 'Problem in tracing')
  })

  it('intercepts inputs and outputs of a given domain function', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)

    let contextFromFunctionA: unknown[] = []

    const c = trace((...context) => {
      contextFromFunctionA = context
    })(a)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(await fromSuccess(c)({ id: 1 }), 2)
    assertEquals(contextFromFunctionA, [success(2), { id: 1 }])
  })
})
