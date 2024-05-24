import { assertEquals, describe, it } from './prelude.ts'
import type { Composable, Result } from '../index.ts'
import { composable, mapParameters, pipe, success } from '../index.ts'

const toString = composable((a: unknown) => `${a}`)
const add = composable((a: number, b: number) => a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('mapParameters', () => {
  it('maps over the parameters of a Composable', async () => {
    const fn = mapParameters(
      add,
      ({ num1, num2 }: { num1: number; num2: number }) => [num1, num2],
    )
    const res = await fn({ num1: 1, num2: 2 })

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<(d: { num1: number; num2: number }) => number>
      >
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(3))
  })

  it('maps with an async function', async () => {
    const fn = mapParameters(
      add,
      // deno-lint-ignore require-await
      async ({ num1, num2 }: { num1: number; num2: number }) => [num1, num2],
    )
    const res = await fn({ num1: 1, num2: 2 })

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<(d: { num1: number; num2: number }) => number>
      >
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(3))
  })

  it('can be used in a composition', async () => {
    const fn = pipe(
      mapParameters(
        add,
        (st: string) => st.split('').map(Number) as [number, number],
      ),
      toString,
    )
    const res = await fn('12')

    type _FN = Expect<Equal<typeof fn, Composable<(s: string) => string>>>
    type _R = Expect<Equal<typeof res, Result<string>>>

    assertEquals(res, success('3'))
  })

  it('returns a Failure when the function fails', async () => {
    const fn = mapParameters(
      faultyAdd,
      ({ num1, num2 }: { num1: number; num2: number }) => [num1, num2],
    )
    const res = await fn({ num1: 1, num2: 2 })

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<(d: { num1: number; num2: number }) => number>
      >
    >

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'a is 1')
  })

  it('fails when the mapper fails', async () => {
    const fn = mapParameters(add, () => {
      throw new Error('Mapper also has problems')
    })
    const res = await fn()
    type _FN = Expect<Equal<typeof fn, Composable<() => never>>>
    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'Mapper also has problems')
  })

  it('requires type-safe return of the mapper according to the fn params', () => {
    // @ts-expect-error: The return type of the mapper is not compatible with the fn parameters
    mapParameters(add, () => ['error'])
    assertEquals(true, true)
  })
})
