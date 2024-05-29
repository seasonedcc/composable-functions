import { assertEquals, assertIsError, describe, it, z } from './prelude.ts'
import {
  all,
  Composable,
  composable,
  ComposableWithSchema,
  failure,
  InputError,
  success,
  withSchema,
} from '../index.ts'

const voidFn = composable(() => {})
const toString = withSchema(z.unknown(), z.any())(String)
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

  it('should return error when one of the schema functions has input errors', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => id)
    const b = withSchema(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        ComposableWithSchema<[number, string]>
      >
    >

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected string, received number', ['id'])]),
    )
  })

  it('should return error when one of the functions fails', async () => {
    const a = composable(({ id }: { id: number }) => id)
    const b = composable(() => {
      throw 'Error'
    })

    const c = all(a, b)
    type _R = Expect<
      Equal<typeof c, Composable<(obj: { id: number }) => [number, never]>>
    >

    assertEquals(await c({ id: 1 }), failure([new Error()]))
  })

  it('should combine the InputError messages of both schema functions', async () => {
    const a = withSchema(z.object({ id: z.string() }))(({ id }) => id)
    const b = withSchema(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        ComposableWithSchema<[string, string]>
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
    const a = composable(() => {
      throw new Error('Error A')
    })
    const b = composable(() => {
      throw new Error('Error B')
    })

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, Composable<() => [never, never]>>>

    const {
      errors: [errA, errB],
    } = await c()
    assertIsError(errA, Error, 'Error A')
    assertIsError(errB, Error, 'Error B')
  })
})
