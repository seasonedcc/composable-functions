import { assertEquals, describe, it } from '../test-prelude.ts'
import { all, composable, success } from '../index.ts'

const voidFn = composable(() => {})
const toString = composable((a: unknown) => `${a}`)
const add = composable((a: number, b: number) => a + b)

describe('all', () => {
  it('executes all functions using the same input returning a tuple with every result when all are successful', async () => {
    const fn = all(add, toString, voidFn)

    const res = await fn(1, 2)

    assertEquals(res, success<[number, string, undefined]>([3, '1', undefined]))
  })
})
