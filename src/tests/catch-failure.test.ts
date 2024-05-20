import { assertEquals, describe, it, z } from './prelude.ts'
import type { Composable, Result } from '../index.ts'
import { catchFailure, composable, success, withSchema } from '../index.ts'

const schemaFaultyAdd = withSchema(
  z.number(),
  z.number(),
)((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('catchFailure', () => {
  it('changes the type to accomodate catcher return type', async () => {
    const fn = catchFailure(schemaFaultyAdd, () => null)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a?: unknown, b?: unknown) => number | null>>
    >
    type _R = Expect<Equal<typeof res, Result<number | null>>>

    assertEquals(res, success(null))
  })

  it('returns original type when catcher returns empty list', async () => {
    const getList = composable(() => [1, 2, 3])
    const fn = catchFailure(getList, () => [])
    const res = await fn()

    type _FN = Expect<Equal<typeof fn, Composable<() => number[]>>>

    assertEquals(res, success<number[]>([1, 2, 3]))
  })

  it('changes the type to accomodate catcher return type', async () => {
    const fn = catchFailure(faultyAdd, () => null)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number | null>>
    >
    type _R = Expect<Equal<typeof res, Result<number | null>>>

    assertEquals(res, success(null))
  })

  it('receives the list of errors as input to another function and returns a new composable', async () => {
    const fn = catchFailure(faultyAdd, (errors, a, b) =>
      errors.length > 1 ? NaN : a + b,
    )
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(3))
  })

  it('fails when catcher fail', async () => {
    const fn = catchFailure(faultyAdd, () => {
      throw new Error('Catcher also has problems')
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'Catcher also has problems')
  })
})
