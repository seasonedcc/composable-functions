import { assertEquals, describe, it } from './prelude.ts'
import type { Composable, Result } from '../index.ts'
import { composable, map, pipe, success } from '../index.ts'

const toString = composable((a: unknown) => `${a}`)
const add = composable((a: number, b: number) => a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('map', () => {
  it('maps over an Composable function successful result', async () => {
    const fn = map(add, (a) => a + 1 === 4)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res, success(true))
  })

  it('maps with an async function', async () => {
    const fn = map(add, (a) => Promise.resolve(a + 1 === 4))
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res, success(true))
  })

  it('maps over a composition', async () => {
    const fn = map(pipe(add, toString), (a) => typeof a === 'string')
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res, success(true))
  })

  it('returns a Failure when the function fails', async () => {
    const fn = map(faultyAdd, (a) => a + 1 === 4)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'a is 1')
  })

  it('fails when the mapper fails', async () => {
    const fn = map(add, () => {
      throw new Error('Mapper also has problems')
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => never>>
    >
    type _R = Expect<Equal<typeof res, Result<never>>>

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'Mapper also has problems')
  })
})
