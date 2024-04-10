import {
  assertEquals,
  assertRejects,
  describe,
  it,
  z,
} from '../test-prelude.ts'
import type { Result, Composable } from '../index.ts'
import { composable, success, fromSuccess, df, ErrorList } from '../index.ts'

const add = composable((a: number, b: number) => a + b)
const asyncAdd = (a: number, b: number) => Promise.resolve(a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('composable', () => {
  it('infers the types if has no arguments or return', async () => {
    const fn = composable(() => {})
    const res = await fn()

    type _FN = Expect<Equal<typeof fn, Composable<() => void>>>
    type _R = Expect<Equal<typeof res, Result<void>>>

    assertEquals(res, success(undefined))
  })

  it('infers the types if has arguments and a return', async () => {
    const fn = add
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(3))
  })

  it('infers the types of async functions', async () => {
    const fn = composable(asyncAdd)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(3))
  })

  it('catch errors', async () => {
    const fn = faultyAdd
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1')
  })
})

describe('fromSuccess', () => {
  it('returns the result.data when the domain function suceeds', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = fromSuccess(a)
    type _R = Expect<
      Equal<
        typeof c,
        (input?: unknown, environment?: unknown) => Promise<number>
      >
    >

    assertEquals(await c({ id: 1 }), 2)
  })

  it('throws an exception when the domain function fails', () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = fromSuccess(a)
    type _R = Expect<
      Equal<
        typeof c,
        (input?: unknown, environment?: unknown) => Promise<number>
      >
    >

    assertRejects(async () => {
      await c({ invalidInput: 'should error' })
    }, ErrorList)
  })

  it('works with composable functions', async () => {
    const a = composable(() => 1)

    const c = fromSuccess(a)
    type _R = Expect<Equal<typeof c, () => Promise<number>>>

    assertEquals(await c(), 1)
  })

  it('allows to change the errors list', () => {
    const a = composable(() => {
      throw new Error('Some error')
    })

    const c = fromSuccess(a, (errors) => [
      new Error(`Number of errors: ${errors.length}`),
    ])
    type _R = Expect<Equal<typeof c, () => Promise<never>>>

    assertRejects(async () => {
      await c()
    }, ErrorList)
  })
})
