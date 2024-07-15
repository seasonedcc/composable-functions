import {
  assertEquals,
  assertIsError,
  assertRejects,
  describe,
  it,
  z,
} from './prelude.ts'
import type {
  Composable,
  ComposableWithSchema,
  Result,
  Success,
} from '../index.ts'
import {
  composable,
  ContextError,
  ErrorList,
  failure,
  fromSuccess,
  InputError,
  success,
  withSchema,
} from '../index.ts'
import { applySchema } from '../index.ts'
import type { Internal } from '../internal/types.ts'
import { assertInstanceOf } from 'https://deno.land/std@0.206.0/assert/assert_instance_of.ts'

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

  it('accepts another composable and avoids nesting it', async () => {
    const a = composable(() => 'hey')
    const fn = composable(a)
    const res = await fn()

    type _FN = Expect<Equal<typeof fn, Composable<() => 'hey'>>>
    type _R = Expect<Equal<typeof res, Result<'hey'>>>

    assertEquals(res, success('hey'))
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

  it('should accept another composable and make it a shallow composable', async () => {
    const fn = composable(add)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number>>
    >
    type _R = Expect<Equal<typeof res, Result<number>>>

    assertEquals(res, success(3))
  })
})

describe('fromSuccess', () => {
  it('returns the result.data when the schema function suceeds', async () => {
    const a = composable((n: number) => n + 1)

    const c = fromSuccess(a)
    type _R = Expect<
      Equal<typeof c, (n: number) => Promise<number>>
    >

    assertEquals(await c(1), 2)
  })

  it('throws an exception when the schema function fails', () => {
    const a = applySchema(z.number())((n) => n + 1)

    const c = fromSuccess(a)
    type _R = Expect<
      Equal<typeof c, (input?: unknown, context?: unknown) => Promise<number>>
    >

    assertRejects(async () => {
      await c({ invalidInput: 'should error' })
    }, ErrorList)
  })

  it('allows to throw any arbitrary value', async () => {
    const a = composable(() => {
      throw new Error('Some error')
    })

    class CustomError {}
    const c = fromSuccess(a, () => {
      throw new CustomError()
    })
    type _R = Expect<Equal<typeof c, () => Promise<never>>>

    try {
      await c()
      throw new Error('should have thrown on the line above')
    } catch (e) {
      assertInstanceOf(e, CustomError)
    }
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
      type _R = Expect<Equal<typeof handler, ComposableWithSchema<string>>>

      assertEquals(await handler(), success('no input!'))
    })

    it('defaults non-declared input to unknown', async () => {
      const handler = withSchema()((args) => args)
      type _R = Expect<Equal<typeof handler, ComposableWithSchema<unknown>>>

      assertEquals(await handler('some input'), {
        success: true,
        data: 'some input',
        errors: [],
      })
    })
  })

  describe('when it has no context', () => {
    it('uses zod parser to create parse the input and call the schema function', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })

      const handler = withSchema(parser)(({ id }) => id)
      type _R = Expect<Equal<typeof handler, ComposableWithSchema<number>>>

      assertEquals(await handler({ id: '1' }), success(1))
    })

    it('fails gracefully if gets something other than empty record', async () => {
      const handler = withSchema()(() => 'no input!')
      type _R = Expect<Equal<typeof handler, ComposableWithSchema<string>>>

      assertEquals(await handler(undefined, ''), success('no input!'))
    })

    it('returns error when parsing fails', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })
      const handler = withSchema(parser)(({ id }) => id)
      type _R = Expect<Equal<typeof handler, ComposableWithSchema<number>>>

      assertEquals(
        await handler({ missingId: '1' }),
        failure([new InputError('Expected number, received nan', ['id'])]),
      )
    })
  })

  it('accepts a composable', async () => {
    const handler = withSchema()(composable(() => 'no input!'))
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<string>>>

    assertEquals(await handler(), success('no input!'))
  })

  it('defaults non-declared input to unknown', async () => {
    const handler = withSchema()((args) => args)
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<unknown>>>

    assertEquals(await handler('some input'), {
      success: true,
      data: 'some input',
      errors: [],
    })
  })

  it('uses zod parsers to parse the input and context and call the schema function', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const ctxParser = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler = withSchema(
      parser,
      ctxParser,
    )(({ id }, { uid }) => [id, uid] as const)
    type _R = Expect<
      Equal<
        typeof handler,
        Composable<
          (input?: unknown, context?: unknown) => readonly [number, number]
        >
      >
    >

    assertEquals(await handler({ id: '1' }, { uid: '2' }), success([1, 2]))
  })

  it('accepts literals as input of schema functions', async () => {
    const handler = withSchema(z.number(), z.string())((n) => n + 1)
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<number>>>

    const result = await handler(1, 'not going to be used')
    assertEquals((result as Success<number>).data, 2)
  })

  it('accepts sync functions', async () => {
    const handler = withSchema(z.number())((n) => n + 1)
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<number>>>

    const result = await handler(1)
    assertEquals((result as Success<number>).data, 2)
  })

  it('returns error when context parsing fails', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const ctxParser = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler = withSchema(
      parser,
      ctxParser,
    )(({ id }, { uid }) => [id, uid])
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<number[]>>>

    assertEquals(
      await handler({ id: '1' }, {}),
      failure([new ContextError('Expected number, received nan', ['uid'])]),
    )
  })

  it('returns error when the schema function throws an Error', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new Error('Error')
    })
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<never>>>

    const {
      errors: [err],
    } = await handler({ id: 1 })
    assertIsError(err, Error, 'Error')
  })

  it('preserves entire original exception when the schema function throws an Error', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new Error('Some message', { cause: { someUnknownFields: true } })
    })
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<never>>>

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
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<never>>>

    assertEquals(await handler({ id: 1 }), failure([new Error()]))
  })

  it('returns error when the schema function throws an object with message', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw { message: 'Error' }
    })
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<never>>>

    const {
      errors: [err],
    } = await handler({ id: 1 })

    assertIsError(err, Error, JSON.stringify({ message: 'Error' }))
  })

  it('returns inputErrors when the schema function throws an InputError', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new InputError('Custom input error', ['contact', 'id'])
    })
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<never>>>

    assertEquals(
      await handler({ id: 1 }),
      failure([new InputError('Custom input error', ['contact', 'id'])]),
    )
  })

  it('returns contextErrors when the schema function throws an ContextError', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new ContextError('Custom ctx error', ['currentUser', 'role'])
    })
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<never>>>

    assertEquals(
      await handler({ id: 1 }),
      failure([new ContextError('Custom ctx error', ['currentUser', 'role'])]),
    )
  })

  it('returns an error result when the schema function throws an ErrorList', async () => {
    const handler = withSchema(z.object({ id: z.number() }))(() => {
      throw new ErrorList([
        new InputError('Custom input error', ['contact', 'id']),
        new ContextError('Custom ctx error', ['currentUser', 'role']),
      ])
    })
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<never>>>

    assertEquals(
      await handler({ id: 1 }),
      failure([
        new InputError('Custom input error', ['contact', 'id']),
        new ContextError('Custom ctx error', ['currentUser', 'role']),
      ]),
    )
  })
})

describe('applySchema', () => {
  it('uses zod parsers to parse the input and context turning it into a schema function', async () => {
    const inputSchema = z.object({ id: z.preprocess(Number, z.number()) })
    const ctxSchema = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler = applySchema(
      inputSchema,
      ctxSchema,
    )(
      ({ id }: { id: number }, { uid }: { uid: number }) => [id, uid] as const,
    )
    type _R = Expect<
      Equal<typeof handler, ComposableWithSchema<readonly [number, number]>>
    >

    assertEquals(
      await handler({ id: 1 }, { uid: 2 }),
      success<[number, number]>([1, 2]),
    )
  })

  it('allow composition with unknown context', async () => {
    const inputSchema = z.string()

    const handler = applySchema(
      inputSchema,
      z.unknown(),
    )((x) => x)
    type _R = Expect<Equal<typeof handler, ComposableWithSchema<string>>>
    const result = await handler('a')

    assertEquals(result, success('a'))
  })

  it('accepts a plain function', async () => {
    const inputSchema = z.object({ id: z.preprocess(Number, z.number()) })
    const ctxSchema = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler = applySchema(
      inputSchema,
      ctxSchema,
    )(
      ({ id }: { id: number }, { uid }: { uid: number }) => [id, uid] as const,
    )
    type _R = Expect<
      Equal<typeof handler, ComposableWithSchema<readonly [number, number]>>
    >

    assertEquals(
      await handler({ id: 1 }, { uid: 2 }),
      success<[number, number]>([1, 2]),
    )
  })

  it('fails to compose when there is an object schema with incompatible properties', async () => {
    const inputSchema = z.object({ x: z.string() })

    const handler = applySchema(inputSchema)(
      composable(({ x }: { x: 'a' }) => x),
    )
    type _R = Expect<
      Equal<typeof handler, Internal.FailToCompose<{ x: string }, { x: 'a' }>>
    >
    // @ts-expect-error: { x: 'a' } is not assignable to { x: string }
    const _result = await handler({ x: 'a' })
  })

  it('fails to compose when schema result is wider than composable input', async () => {
    const inputSchema = z.string()

    const handler = applySchema(inputSchema)(composable((x: 'a') => x))
    type _R = Expect<Equal<typeof handler, Internal.FailToCompose<string, 'a'>>>
    // @ts-expect-error: 'a' is not assignable to 'string'
    const _result = await handler('a')
  })
})
