import { assertEquals, describe, it, z } from '../test-prelude.ts'
import type { Result, Composable } from '../index.ts'
import { composable, sequence, success } from '../index.ts'
import { withSchema } from '../index.ts'

const toString = composable((a: unknown) => `${a}`)
const add = withSchema(z.number(), z.number())((a, b) => a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('sequence', () => {
  it('sends the results of the first function to the second and saves every step of the result', async () => {
    const fn = sequence(add, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<
        typeof fn,
        // TODO: this is wrong, it should infer the params
        Composable<(a?: unknown, b?: unknown) => [number, string]>
      >
    >
    type _R = Expect<Equal<typeof res, Result<[number, string]>>>

    assertEquals(res, success<[number, string]>([3, '3']))
  })

  it('type checks and composes async functions', async () => {
    const asyncProduceToIncrement = composable(() =>
      Promise.resolve({ toIncrement: 1, someOtherProperty: 'test' }),
    )
    const asyncIncrementProperty = composable((a: { toIncrement: number }) =>
      Promise.resolve(a.toIncrement + 1),
    )
    const fn = sequence(asyncProduceToIncrement, asyncIncrementProperty)
    const res = await fn()

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<
          () => [{ toIncrement: number; someOtherProperty: string }, number]
        >
      >
    >
    type _R = Expect<
      Equal<
        typeof res,
        Result<[{ toIncrement: number; someOtherProperty: string }, number]>
      >
    >

    assertEquals(
      res,
      success<[{ toIncrement: number; someOtherProperty: string }, number]>([
        { toIncrement: 1, someOtherProperty: 'test' },
        2,
      ]),
    )
  })

  it('catches the errors from function A', async () => {
    const fn = sequence(faultyAdd, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => [number, string]>>
    >
    type _R = Expect<Equal<typeof res, Result<[number, string]>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1')
  })
})
