import {
  assertEquals,
  assertIsError,
  describe,
  it,
  z,
} from '../test-prelude.ts'
import type { Result, Composable, DomainFunction } from '../index.ts'
import {
  collect,
  df,
  failure,
  InputError,
  composable,
  success,
} from '../index.ts'

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
    //@ts-expect-error add and append parameters are incompatible
    const fn = collect({
      add: add,
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

  it('should combine an object of domain functions', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = df.make(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: number }>>>

    assertEquals(await c({ id: 1 }), success({ a: 2, b: 0 }))
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id)
    const b = df.make(z.object({ id: z.string() }))(({ id }) => id)

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: string }>>>

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected string, received number', ['id'])]),
    )
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id)
    const b = df.make(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: never }>>>

    assertEquals(await c({ id: 1 }), failure([new Error()]))
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = df.make(z.object({ id: z.string() }))(({ id }) => id)
    const b = df.make(z.object({ id: z.string() }))(({ id }) => id)

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: string; b: string }>>>

    assertEquals(
      await c({ id: 1 }),
      failure([
        new InputError('Expected string, received number', ['id']),
        new InputError('Expected string, received number', ['id']),
      ]),
    )
  })

  it('should combine the error messages when both functions fail', async () => {
    const a = df.make(z.object({ id: z.number() }))(() => {
      throw new Error('Error A')
    })
    const b = df.make(z.object({ id: z.number() }))(() => {
      throw new Error('Error B')
    })

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: never; b: never }>>>

    const {
      errors: [errA, errB],
    } = await c({ id: 1 })
    assertIsError(errA, Error, 'Error A')
    assertIsError(errB, Error, 'Error B')
  })
})
