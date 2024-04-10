import { assertEquals, describe, it } from '../test-prelude.ts'
import { map, mapError, pipe, sequence } from './index.ts'
import { Equal, Expect } from './types.test.ts'
import type { Result } from '../types.ts'
import type { Composable } from './types.ts'
import { all, catchError, collect, composable } from './composable.ts'
import { success } from '../constructor.ts'

const voidFn = composable(() => {})
const toString = composable((a: unknown) => `${a}`)
const append = composable((a: string, b: string) => `${a}${b}`)
const add = composable((a: number, b: number) => a + b)
const asyncAdd = (a: number, b: number) => Promise.resolve(a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})
const alwaysThrow = composable(() => {
  throw new Error('always throw', { cause: 'it was made for this' })
})

describe('composable', () => {
  it('infers the types if has no arguments or return', async () => {
    const fn = composable(() => {})
    const res = await fn()

    type _FN = Expect<Equal<typeof fn, Composable<() => void>>>
    type _R = Expect<Equal<typeof res, Result<void>>>

    assertEquals(res, success(undefined))
  })

  it('infers the types if has arguments and a return', async () => {
    const fn = add
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(3))
  })

  it('infers the types of async functions', async () => {
    const fn = composable(asyncAdd)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(3))
  })

  it('catch errors', async () => {
    const fn = faultyAdd
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1')
  })
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

describe('sequence', () => {
  it('sends the results of the first function to the second and saves every step of the result', async () => {
    const fn = sequence(add, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => [number, string]>>
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

describe('all', () => {
  it('executes all functions using the same input returning a tuple with every result when all are successful', async () => {
    const fn = all(add, toString, voidFn)

    const res = await fn(1, 2)

    assertEquals(res, success<[number, string, undefined]>([3, '1', undefined]))
  })
})

describe('collect', () => {
  it('collects the results of an object of Composables into a result with same format', async () => {
    const fn = collect({
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
    //@ts-expect-error add and append parameters are incompatible
    // The runtime will work since passing 1, 2 will be coerced to '1', '2'
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

  it('maps over a composition', async () => {
    const fn = map(pipe(add, toString), (a) => typeof a === 'string')
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res, success(true))
  })

  it('does not do anything when the function fails', async () => {
    const fn = map(faultyAdd, (a) => a + 1 === 4)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1')
  })

  it('fails when mapper fail', async () => {
    const fn = map(add, () => {
      throw new Error('Mapper also has problems')
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => never>>
    >
    type _R = Expect<Equal<typeof res, Result<never>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'Mapper also has problems')
  })
})

const cleanError = (err: Error) => ({
  ...err,
  message: err.message + '!!!',
})
describe('mapError', () => {
  it('maps over the error results of an Composable function', async () => {
    const fn = mapError(faultyAdd, ({ errors }) => ({
      errors: errors.map(cleanError),
    }))
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1!!!')
  })

  it('fails when mapper fail', async () => {
    const fn = mapError(faultyAdd, () => {
      throw new Error('Mapper also has problems')
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'Mapper also has problems')
  })
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
