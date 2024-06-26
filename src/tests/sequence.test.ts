import { assertEquals, describe, it, z } from './prelude.ts'
import type { Composable, Result } from '../index.ts'
import { composable, sequence, success } from '../index.ts'
import { withSchema } from '../index.ts'

const toString = composable((a: unknown) => `${a}`)
const schemaAdd = withSchema(z.number(), z.number())((a, b) => a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('sequence', () => {
  it('sends the results of the first function to the second and saves every step of the result', async () => {
    const fn = sequence(schemaAdd, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<(a?: unknown, b?: unknown) => [number, string]>
      >
    >
    type _R = Expect<Equal<typeof res, Result<[number, string]>>>

    assertEquals(res, success<[number, string]>([3, '3']))
  })

  it('accepts plain functions', async () => {
    const fn = sequence((a: number, b: number) => a + b, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => [number, string]>>
    >
    type _R = Expect<Equal<typeof res, Result<[number, string]>>>

    assertEquals(res, success<[number, string]>([3, '3']))
  })

  it('type checks and composes async functions', async () => {
    const asyncProduceToIncrement = composable(() =>
      Promise.resolve({ toIncrement: 1, someOtherProperty: 'test' })
    )
    const asyncIncrementProperty = composable((a: { toIncrement: number }) =>
      Promise.resolve(a.toIncrement + 1)
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
    assertEquals(res.errors[0].message, 'a is 1')
  })
})
