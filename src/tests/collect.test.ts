import { assertEquals, describe, it } from '../test-prelude.ts'
import type { Result, Composable } from '../index.ts'
import { collect, composable, success } from '../index.ts'

const voidFn = composable(() => {})
const toString = composable((a: unknown) => `${a}`)
const append = composable((a: string, b: string) => `${a}${b}`)
const add = composable((a: number, b: number) => a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('collect', () => {
  it('collects the results of an object of Composables into a result with same format', async () => {
    const fn: Composable<
      (
        args_0: number,
        args_1: number,
      ) => {
        add: number
        string: string
        void: void
      }
    > = collect({
      add: add,
      string: toString,
      void: voidFn,
    })

    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<
          (
            a: number,
            b: number,
          ) => {
            add: number
            string: string
            void: void
          }
        >
      >
    >
    type _R = Expect<
      Equal<typeof res, Result<{ add: number; string: string; void: void }>>
    >

    assertEquals(res, success({ add: 3, string: '1', void: undefined }))
  })

  it('uses the same arguments for every function', async () => {
    // The runtime will work since passing 1, 2 will be coerced to '1', '2'
    const fn = collect({
      //@ts-expect-error add and append parameters are incompatible
      add: add,
      //@ts-expect-error add and append parameters are incompatible
      string: append,
    })
    //@ts-expect-error add and append parameters are incompatible
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<
          (...args: never) => {
            add: number
            string: string
          }
        >
      >
    >
    type _R = Expect<Equal<typeof res, Result<any>>>
    assertEquals(res, success({ add: 3, string: '12' }))
  })

  it('collects the errors in the error array', async () => {
    const fn = collect({
      error1: faultyAdd,
      error2: faultyAdd,
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<
          (
            a: number,
            b: number,
          ) => {
            error1: number
            error2: number
          }
        >
      >
    >
    type _R = Expect<
      Equal<typeof res, Result<{ error1: number; error2: number }>>
    >

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1')
    assertEquals(res.errors![1].message, 'a is 1')
  })
})
