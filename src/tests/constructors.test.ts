import {
  assertEquals,
  assertIsError,
  assertRejects,
  describe,
  it,
  z,
} from './prelude.ts'
import type { Composable, Result, Success } from '../index.ts'
import {
  composable,
  EnvironmentError,
  ErrorList,
  failure,
  fromSuccess,
  InputError,
  success,
  withSchema,
} from '../index.ts'
import { applySchema } from '../index.ts'

const add = composable((a: number, b: number) => a + b)
const asyncAdd = (a: number, b: number) => Promise.resolve(a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
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

  it('will enforce noImplicitAny', () => {
    // @ts-expect-error: implicit any
    const fn = composable((a) => a)
    type _FN = Expect<Equal<typeof fn, Composable<(a: any) => any>>>
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
    assertEquals(res.errors[0].message, 'a is 1')
  })
})

describe('fromSuccess', () => {
  it('returns the result.data when the schema function suceeds', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = fromSuccess(a)
    type _R = Expect<
      Equal<
        typeof c,
        (input?: unknown, environment?: unknown) => Promise<number>
      >
    >

    assertEquals(await c({ id: 1 }), 2)
  })

  it('throws an exception when the schema function fails', () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = fromSuccess(a)
    type _R = Expect<
      Equal<
        typeof c,
        (input?: unknown, environment?: unknown) => Promise<number>
      >
    >

    assertRejects(async () => {
      await c({ invalidInput: 'should error' })
    }, ErrorList)
  })

  it('works with composable functions', async () => {
    const a = composable(() => 1)

    const c = fromSuccess(a)
    type _R = Expect<Equal<typeof c, () => Promise<1>>>

    assertEquals(await c(), 1)
  })

  it('allows to change the errors list', () => {
    const a = composable(() => {
      throw new Error('Some error')
    })

    const c = fromSuccess(a, (errors) => [
      new Error(`Number of errors: ${errors.length}`),
    ])
    type _R = Expect<Equal<typeof c, () => Promise<never>>>

    assertRejects(async () => {
      await c()
    }, ErrorList)
  })
})

describe('withSchema', () => {
  describe('when it has no input', () => {
    it('uses zod parser to create parse the input and call the schema function', async () => {
      const handler = withSchema()(() => 'no input!')
      type _R = Expect<
        Equal<
          typeof handler,
          Composable<(input?: unknown, environment?: unknown) => string>
        >
      >

      assertEquals(await handler(), success('no input!'))
    })

    it('ignores the input and pass undefined', async () => {
      const handler = withSchema()((args) => args)
      type _R = Expect<
        Equal<
          typeof handler,
          Composable<(input?: unknown, environment?: unknown) => unknown>
        >
      >

      assertEquals(await handler('some input'), {
        success: true,
        data: 'some input',
        errors: [],
      })
    })
  })

  describe('when it has no environment', () => {
    it('uses zod parser to create parse the input and call the schema function', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })

      const handler = withSchema(parser)(({ id }) => id)
      type _R = Expect<
        Equal<
          typeof handler,
          Composable<(input?: unknown, environment?: unknown) => number>
        >
      >

      assertEquals(await handler({ id: '1' }), success(1))
    })

    it('fails gracefully if gets something other than empty record', async () => {
      const handler = withSchema()(() => 'no input!')
      type _R = Expect<
        Equal<
          typeof handler,
          Composable<(input?: unknown, environment?: unknown) => string>
        >
      >

      assertEquals(await handler(undefined, ''), success('no input!'))
    })

    it('returns error when parsing fails', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })
      const handler = withSchema(parser)(({ id }) => id)
      type _R = Expect<
        Equal<
          typeof handler,
          Composable<(input?: unknown, environment?: unknown) => number>
        >
      >

      assertEquals(
        await handler({ missingId: '1' }),
        failure([new InputError('Expected number, received nan', ['id'])]),
      )
    })
  })

  it('uses zod parsers to parse the input and environment and call the schema function', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const envParser = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler = withSchema(
      parser,
      envParser,
    )(({ id }, { uid }) => [id, uid] as const)
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<
          (input?: unknown, environment?: unknown) => readonly [number, number]
        >
      >
    >

    assertEquals(await handler({ id: '1' }, { uid: '2' }), success([1, 2]))
  })

  it('applies async validations', async () => {
    const parser = z.object({
      id: z
        .preprocess(Number, z.number())
        .refine((value) => value !== 1, { message: 'ID already taken' }),
    })

    const envParser = z.object({
      uid: z
        .preprocess(Number, z.number())
        .refine((value) => value !== 2, { message: 'UID already taken' }),
    })

    const handler = withSchema(
      parser,
      envParser,
    )(({ id }, { uid }) => [id, uid])
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => number[]>
      >
    >

    assertEquals(
      await handler({ id: '1' }, { uid: '2' }),
      failure([
        new InputError('ID already taken', ['id']),
        new EnvironmentError('UID already taken', ['uid']),
      ]),
    )
  })

  it('accepts literals as input of schema functions', async () => {
    const handler = withSchema(z.number(), z.string())((n) => n + 1)
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    const result = await handler(1, 'not going to be used')
    assertEquals((result as Success<number>).data, 2)
  })

  it('accepts sync functions', async () => {
    const handler = withSchema(z.number())((n) => n + 1)
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    const result = await handler(1)
    assertEquals((result as Success<number>).data, 2)
  })

  it('returns error when environment parsing fails', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const envParser = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler = withSchema(
      parser,
      envParser,
    )(({ id }, { uid }) => [id, uid])
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => number[]>
      >
    >

    assertEquals(
      await handler({ id: '1' }, {}),
      failure([new EnvironmentError('Expected number, received nan', ['uid'])]),
    )
  })

  it('returns error when the schema function throws an Error', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new Error('Error')
    })
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    const {
      errors: [err],
    } = await handler({ id: 1 })
    assertIsError(err, Error, 'Error')
  })

  it('preserves entire original exception when the schema function throws an Error', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new Error('Some message', { cause: { someUnknownFields: true } })
    })
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    const {
      errors: [err],
    } = await handler({ id: 1 })
    assertIsError(err, Error, 'Some message')
    assertEquals(err.cause, { someUnknownFields: true })
  })

  it('returns error when the schema function throws a string', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    assertEquals(await handler({ id: 1 }), failure([new Error()]))
  })

  it('returns error when the schema function throws an object with message', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw { message: 'Error' }
    })
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    const {
      errors: [err],
    } = await handler({ id: 1 })

    assertIsError(err, Error, JSON.stringify({ message: 'Error' }))
  })

  it('returns inputErrors when the schema function throws an InputError', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new InputError('Custom input error', ['contact', 'id'])
    })
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    assertEquals(
      await handler({ id: 1 }),
      failure([new InputError('Custom input error', ['contact', 'id'])]),
    )
  })

  it('returns environmentErrors when the schema function throws an EnvironmentError', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new EnvironmentError('Custom env error', ['currentUser', 'role'])
    })
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    assertEquals(
      await handler({ id: 1 }),
      failure([
        new EnvironmentError('Custom env error', ['currentUser', 'role']),
      ]),
    )
  })

  it('returns an error result when the schema function throws an ErrorList', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new ErrorList([
        new InputError('Custom input error', ['contact', 'id']),
        new EnvironmentError('Custom env error', ['currentUser', 'role']),
      ])
    })
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => never>
      >
    >

    assertEquals(
      await handler({ id: 1 }),
      failure([
        new InputError('Custom input error', ['contact', 'id']),
        new EnvironmentError('Custom env error', ['currentUser', 'role']),
      ]),
    )
  })
})

describe('applySchema', () => {
  it('uses zod parsers to parse the input and environment turning it into a schema function', async () => {
    const inputSchema = z.object({ id: z.preprocess(Number, z.number()) })
    const envSchema = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler = applySchema(
      inputSchema,
      envSchema,
    )(
      composable(
        ({ id }: { id: number }, { uid }: { uid: number }) =>
          [id, uid] as const,
      ),
    )
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<
          (input?: unknown, environment?: unknown) => readonly [number, number]
        >
      >
    >

    assertEquals(await handler({ id: 1 }, { uid: 2 }), success([1, 2]))
  })

  it('can be used as a layer on top of withSchema fn', async () => {
    const fn = withSchema(z.object({ id: z.number() }))(({ id }) => id + 1)
    const prepareSchema = z.string().transform((v) => ({ id: Number(v) }))
    const handler = applySchema(prepareSchema)(fn)
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    const result = await handler('1')
    assertEquals(result, success(2))
  })
})
