import { assertEquals, describe, it } from './prelude.ts'
import type { Composable, Result } from '../index.ts'
import { composable, mapErrors } from '../index.ts'
import { success } from '../constructors.ts'

const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

const cleanError = (err: Error) => ({
  ...err,
  message: err.message + '!!!',
})
describe('mapErrors', () => {
  it('maps over the error results of a Composable function', async () => {
    const fn = mapErrors(faultyAdd, (errors) => errors.map(cleanError))
    const res = await fn(2, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(4))
  })

  it('accepts plain functions', async () => {
    const fn = mapErrors((a: number, b: number) => {
      if (a === 1) throw new Error('a is 1')
      return a + b
    }, (errors) => errors.map(cleanError))
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'a is 1!!!')
  })

  it('will enforce noImplicitAny', () => {
    // @ts-expect-error: implicit any
    const _fn = mapErrors((a) => a, (errors) => errors)
  })

  it('maps over the error results of a Composable function', async () => {
    const fn = mapErrors(faultyAdd, (errors) => errors.map(cleanError))
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'a is 1!!!')
  })

  it('maps using the original input', async () => {
    const fn = mapErrors(faultyAdd, (_, a, b) => {
      throw new Error('result would be ' + (a + b))
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'result would be 3')
  })

  it('accepts an async mapper', async () => {
    const fn = mapErrors(
      faultyAdd,
      (errors) => Promise.resolve(errors.map(cleanError)),
    )
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'a is 1!!!')
  })

  it('fails when mapper fail', async () => {
    const fn = mapErrors(faultyAdd, () => {
      throw new Error('Mapper also has problems')
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'Mapper also has problems')
  })
})
