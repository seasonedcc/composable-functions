import { assertEquals, describe, it } from '../test-prelude.ts'
import type { Result, Composable } from '../index.ts'
import { composable, pipe, success } from '../index.ts'

const toString = composable(String)
const add = composable((a: number, b: number) => a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})
const alwaysThrow = composable(() => {
  throw new Error('always throw', { cause: 'it was made for this' })
})

describe('pipe', () => {
  it('sends the results of the first function to the second and infers types', async () => {
    const fn = pipe(add, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => string>>
    >
    type _R = Expect<Equal<typeof res, Result<string>>>

    assertEquals(res, success('3'))
  })

  it('type checks and composes async functions', async () => {
    const asyncProduceToIncrement = composable(() =>
      Promise.resolve({ toIncrement: 1, someOtherProperty: 'test' }),
    )
    const asyncIncrementProperty = composable((a: { toIncrement: number }) =>
      Promise.resolve(a.toIncrement + 1),
    )
    const fn = pipe(asyncProduceToIncrement, asyncIncrementProperty)
    const res = await fn()

    type _FN = Expect<Equal<typeof fn, Composable<() => number>>>
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(2))
  })

  it('catches the errors from function A', async () => {
    const fn = pipe(faultyAdd, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => string>>
    >
    type _R = Expect<Equal<typeof res, Result<string>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1')
  })

  it('catches the errors from function B', async () => {
    //@ts-expect-error alwaysThrow won't type-check the composition since its return type is never and toString expects an unknown parameter
    const fn = pipe(add, alwaysThrow, toString)
    //@ts-expect-error alwaysThrow won't type-check the composition since its return type is never and toString expects an unknown parameter
    const res = await fn(1, 2)

    type _FN = Expect<
      //@ts-expect-error alwaysThrow won't type-check the composition since its return type is never and toString expects an unknown parameter
      Equal<typeof fn, Composable<(a: number, b: number) => string>>
    >
    type _R = Expect<Equal<typeof res, Result<string>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'always throw')
    assertEquals(
      // deno-lint-ignore no-explicit-any
      (res.errors[0] as any).cause,
      'it was made for this',
    )
  })
})
