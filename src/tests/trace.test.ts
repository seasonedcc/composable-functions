import { assertEquals, assertIsError, describe, it, z } from './prelude.ts'
import {
  composable,
  fromSuccess,
  success,
  trace,
  withSchema,
} from '../index.ts'
import type { Composable, ComposableWithSchema, Result } from '../index.ts'

describe('trace', () => {
  it('converts trace exceptions to failures', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = trace(() => {
      throw new Error('Problem in tracing')
    })(a)
    type _R = Expect<
      Equal<
        typeof c,
        ComposableWithSchema<number>
      >
    >

    const result = await c({ id: 1 })

    assertIsError(result.errors[0], Error, 'Problem in tracing')
  })

  it('accepts plain functions as composable', async () => {
    const a = (id: number) => id + 1
    const b = trace((result) => console.log(result.success))(a)
    const res = await b(1)

    type _FN = Expect<Equal<typeof b, Composable<(id: number) => number>>>
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(2))
  })

  it('converts trace exceptions to failures', async () => {
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

  it('intercepts inputs and outputs of a given composable', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => id + 1)

    let contextFromFunctionA: unknown[] = []

    const c = trace((...context) => {
      contextFromFunctionA = context
    })(a)
    type _R = Expect<
      Equal<
        typeof c,
        ComposableWithSchema<number>
      >
    >

    assertEquals(await fromSuccess(c)({ id: 1 }), 2)
    assertEquals(contextFromFunctionA, [success(2), { id: 1 }])
  })
})
