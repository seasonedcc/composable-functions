import { assertEquals, describe, it } from '../test-prelude.ts'
import type { Result, Composable } from '../index.ts'
import { catchError, composable, success } from '../index.ts'

const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('catchError', () => {
  it('changes the type to accomodate catcher return type', async () => {
    const fn = catchError(faultyAdd, () => null)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number | null>>
    >
    type _R = Expect<Equal<typeof res, Result<number | null>>>

    assertEquals(res, success(null))
  })

  it('receives the list of errors as input to another function and returns a new composable', async () => {
    const fn = catchError(faultyAdd, (errors, a, b) =>
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
    const fn = catchError(faultyAdd, () => {
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
