import {
  assertEquals,
  assertIsError,
  describe,
  it,
  z,
} from '../test-prelude.ts'
import {
  all,
  composable,
  success,
  df,
  Composable,
  InputError,
  failure,
} from '../index.ts'

const voidFn = composable(() => {})
const toString = composable(String)
const add = composable((a: number, b: number) => a + b)
const optionalAdd = composable((a: number, b?: number) => a + (b ?? 1))

describe('all', () => {
  it('executes all functions using the same input returning a tuple with every result when all are successful', async () => {
    const fn = all(add, toString, voidFn)

    const res = await fn(1, 2)

    assertEquals(res, success<[number, string, undefined]>([3, '1', undefined]))
  })

  it('handles optional arguments', async () => {
    const fn = all(optionalAdd, toString, voidFn)

    const res = await fn(1, 2)

    assertEquals(res, success<[number, string, undefined]>([3, '1', undefined]))
  })

  it('should combine two domain functions into one', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = df.make(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = all(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => [number, number]>
      >
    >

    assertEquals(await c({ id: 1 }), success<[number, number]>([2, 0]))
  })

  it('should combine many domain functions into one', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => String(id))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const c = df.make(z.object({ id: z.number() }))(({ id }) => Boolean(id))
    const d = all(a, b, c)
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (input?: unknown, environment?: unknown) => [string, number, boolean]
        >
      >
    >

    const results = await d({ id: 1 })
    assertEquals(results, success<[string, number, boolean]>(['1', 2, true]))
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id)
    const b = df.make(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => [number, string]>
      >
    >

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

    const c = all(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => [number, never]>
      >
    >

    assertEquals(await c({ id: 1 }), failure([new Error()]))
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = df.make(z.object({ id: z.string() }))(({ id }) => id)
    const b = df.make(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => [string, string]>
      >
    >

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

    const c = all(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => [never, never]>
      >
    >

    const {
      errors: [errA, errB],
    } = await c({ id: 1 })
    assertIsError(errA, Error, 'Error A')
    assertIsError(errB, Error, 'Error B')
  })
})
