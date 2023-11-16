import {
  assertEquals,
  describe,
  it,
} from '../test-prelude.ts'
import { map, mapError, pipe, sequence } from './index.ts'
import type { Composable, ErrorWithMessage, Result } from './index.ts'
import { Equal, Expect } from './types.test.ts'
import { all, collect, λ } from './composable.ts'

const voidFn = () => {}
const toString = (a: unknown) => `${a}`
const append = (a: string, b: string) => `${a}${b}`
const add = (a: number, b: number) => a + b
const asyncAdd = (a: number, b: number) => Promise.resolve(a + b)
const faultyAdd = (a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
}
const alwaysThrow = () => {
  throw new Error('always throw', { cause: 'it was made for this' })
}

describe('composable', () => {
  it('infers the types if has no arguments or return', async () => {
    const fn = λ(() => {})
    const res = await fn()

    type _FN = Expect<Equal<typeof fn, Composable<() => void>>>
    type _R = Expect<Equal<typeof res, Result<void>>>

    assertEquals(res, { success: true, data: undefined, errors: [] })
  })

  it('infers the types if has arguments and a return', async () => {
    const fn = λ(add)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, { success: true, data: 3, errors: [] })
  })

  it('infers the types of async functions', async () => {
    const fn = λ(asyncAdd)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, { success: true, data: 3, errors: [] })
  })

  it('catch errors', async () => {
    const fn = λ(faultyAdd)
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
    const fn = pipe(λ(add), λ(toString))
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => string>>
    >
    type _R = Expect<Equal<typeof res, Result<string>>>

    assertEquals(res, { success: true, data: '3', errors: [] })
  })

  it('catches the errors from function A', async () => {
    const fn = pipe(λ(faultyAdd), λ(toString))
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => string>>
    >
    type _R = Expect<Equal<typeof res, Result<string>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1')
  })

  it('catches the errors from function B', async () => {
    const fn = pipe(λ(add), λ(alwaysThrow), λ(toString))
    // TODO this should not type check
    const res = await fn(1, 2)

    // TODO this should be a type error
    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => string>>
    >
    type _R = Expect<Equal<typeof res, Result<string>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'always throw')
    assertEquals(
      // deno-lint-ignore no-explicit-any
      (res.errors[0] as any).exception?.cause,
      'it was made for this',
    )
  })
})

describe('sequence', () => {
  it('sends the results of the first function to the second and saves every step of the result', async () => {
    const fn = sequence(λ(add), λ(toString))
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => [number, string]>>
    >
    type _R = Expect<Equal<typeof res, Result<[number, string]>>>

    assertEquals(res, { success: true, data: [3, '3'], errors: [] })
  })

  it('catches the errors from function A', async () => {
    const fn = sequence(λ(faultyAdd), λ(toString))
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
    const fn = all(λ(add), λ(toString), λ(voidFn))

    const res = await fn(1, 2)

    assertEquals(res, { success: true, data: [3, '1', undefined], errors: [] })
  })
})

describe('collect', () => {
  it('collects the results of an object of Composables into a result with same format', async () => {
    const fn = collect({
      add: λ(add),
      string: λ(toString),
      void: λ(voidFn),
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<
          (...args: [] | [a: number, b: number] | [a: unknown]) => {
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

    assertEquals(res, {
      success: true,
      data: { add: 3, string: '1', void: undefined },
      errors: [],
    })
  })

  it('uses the same arguments for every function', async () => {
    const fn = collect({
      add: λ(add),
      string: λ(append),
    })
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<
        typeof fn,
        Composable<
          (...args: [a: number, b: number] | [a: string, b: string]) => {
            add: number
            string: string
          }
        >
      >
    >
    type _R = Expect<Equal<typeof res, Result<{ add: number; string: string }>>>
    assertEquals(res, {
      success: true,
      data: { add: 3, string: '12' },
      errors: [],
    })
  })

  it('collects the errors in the error array', async () => {
    const fn = collect({
      error1: λ(faultyAdd),
      error2: λ(faultyAdd),
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
    const fn = map(λ(add), (a) => a + 1 === 4)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res, { success: true, data: true, errors: [] })
  })

  it('maps over a composition', async () => {
    const fn = map(
      pipe(λ(add), λ(toString)),
      (a) => typeof a === 'string',
    )
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res, { success: true, data: true, errors: [] })
  })

  it('does not do anything when the function fails', async () => {
    const fn = map(λ(faultyAdd), (a) => a + 1 === 4)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => boolean>>
    >
    type _R = Expect<Equal<typeof res, Result<boolean>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1')
  })
})

const cleanError = (err: ErrorWithMessage) => ({
  message: err.message + '!!!',
})
describe('mapError', () => {
  it('maps over the error results of an Composable function', async () => {
    const fn = mapError(λ(faultyAdd), cleanError)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res.success, false)
    assertEquals(res.errors![0].message, 'a is 1!!!')
  })
})

