// deno-lint-ignore-file require-await
import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import {
  assertEquals,
  assertObjectMatch,
  assertRejects,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { z } from 'https://deno.land/x/zod@v3.19.1/mod.ts'

import {
  all,
  combine,
  first,
  fromSuccess,
  makeDomainFunction,
  map,
  mapError,
  merge,
  pipe,
  sequence,
  trace,
} from './domain-functions.ts'
import {
  EnvironmentError,
  ResultError,
  InputError,
  InputErrors,
} from './errors.ts'
import type { DomainFunction, ErrorData, SuccessResult } from './types.ts'

describe('makeDomainFunction', () => {
  describe('when it has no input', async () => {
    const handler = makeDomainFunction()(async () => 'no input!')

    assertEquals(await handler(), {
      success: true,
      data: 'no input!',
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  describe('when it has no environment', () => {
    it('uses zod parser to create parse the input and call the domain function', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })

      const handler: DomainFunction<number> = makeDomainFunction(parser)(
        async ({ id }) => id,
      )

      assertEquals(await handler({ id: '1' }), {
        success: true,
        data: 1,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
      })
    })

    it('returns error when parsing fails', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })
      const handler: DomainFunction<number> = makeDomainFunction(parser)(
        async ({ id }) => id,
      )

      assertEquals(await handler({ missingId: '1' }), {
        success: false,
        inputErrors: [
          { message: 'Expected number, received nan', path: ['id'] },
        ],
        environmentErrors: [],
        errors: [],
      })
    })
  })

  it('uses zod parsers to parse the input and environment and call the domain function', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const envParser = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler: DomainFunction<readonly [number, number]> =
      makeDomainFunction(
        parser,
        envParser,
      )(async ({ id }, { uid }) => [id, uid] as const)

    assertEquals(await handler({ id: '1' }, { uid: '2' }), {
      success: true,
      data: [1, 2],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('applies async validations', async () => {
    const parser = z.object({
      id: z
        .preprocess(Number, z.number())
        .refine(async (value) => value !== 1, { message: 'ID already taken' }),
    })

    const envParser = z.object({
      uid: z
        .preprocess(Number, z.number())
        .refine(async (value) => value !== 2, { message: 'UID already taken' }),
    })

    const handler: DomainFunction<number[]> = makeDomainFunction(
      parser,
      envParser,
    )(async ({ id }, { uid }) => [id, uid])

    assertEquals(await handler({ id: '1' }, { uid: '2' }), {
      success: false,
      errors: [],
      inputErrors: [{ message: 'ID already taken', path: ['id'] }],
      environmentErrors: [{ message: 'UID already taken', path: ['uid'] }],
    })
  })

  it('accepts literals as input of domain functions', async () => {
    const handler: DomainFunction<number> = makeDomainFunction(
      z.number(),
      z.string(),
    )(async (n) => n + 1)
    const result = await handler(1, 'not going to be used')
    assertEquals((result as SuccessResult<number>).data, 2)
  })

  it('returns error when environment parsing fails', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const envParser = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler: DomainFunction<number[]> = makeDomainFunction(
      parser,
      envParser,
    )(async ({ id }, { uid }) => [id, uid])

    assertEquals(await handler({ id: '1' }, {}), {
      success: false,
      inputErrors: [],
      environmentErrors: [
        { message: 'Expected number, received nan', path: ['uid'] },
      ],
      errors: [],
    })
  })

  it('returns error when the domain function throws an Error', async () => {
    const domainFunction: DomainFunction<never> = makeDomainFunction(
      z.object({ id: z.number() }),
    )(async () => {
      throw new Error('Error')
    })

    assertObjectMatch(await domainFunction({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('preserves entire original exception when the domain function throws an Error', async () => {
    const domainFunction: DomainFunction<never> = makeDomainFunction(
      z.object({ id: z.number() }),
    )(async () => {
      throw new Error('Some message', { cause: { someUnknownFields: true } })
    })

    assertObjectMatch(await domainFunction({ id: 1 }), {
      success: false,
      errors: [
        {
          message: 'Some message',
          exception: {
            message: 'Some message',
            cause: { someUnknownFields: true },
          },
        },
      ],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns error when the domain function throws a string', async () => {
    const domainFunction: DomainFunction<never> = makeDomainFunction(
      z.object({ id: z.number() }),
    )(async () => {
      throw 'Error'
    })

    assertObjectMatch(await domainFunction({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns error when the domain function throws an object with message', async () => {
    const domainFunction: DomainFunction<never> = makeDomainFunction(
      z.object({ id: z.number() }),
    )(async () => {
      throw { message: 'Error' }
    })

    assertEquals(await domainFunction({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: { message: 'Error' } }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns inputErrors when the domain function throws an InputError', async () => {
    const domainFunction: DomainFunction<never> = makeDomainFunction(
      z.object({ id: z.number() }),
    )(async () => {
      throw new InputError('Custom input error', 'contact.id')
    })

    assertEquals(await domainFunction({ id: 1 }), {
      success: false,
      errors: [],
      inputErrors: [{ message: 'Custom input error', path: ['contact', 'id'] }],
      environmentErrors: [],
    })
  })

  it('returns multiple inputErrors when the domain function throws an InputErrors', async () => {
    const domainFunction: DomainFunction<never> = makeDomainFunction(
      z.object({ id: z.number() }),
    )(async () => {
      throw new InputErrors([
        { message: 'Custom input error', path: 'contact.id' },
        { message: 'Another input error', path: 'contact.id' },
      ])
    })

    assertEquals(await domainFunction({ id: 1 }), {
      success: false,
      errors: [],
      inputErrors: [
        { message: 'Custom input error', path: ['contact', 'id'] },
        { message: 'Another input error', path: ['contact', 'id'] },
      ],
      environmentErrors: [],
    })
  })

  it('returns environmentErrors when the domain function throws an EnvironmentError', async () => {
    const domainFunction: DomainFunction<never> = makeDomainFunction(
      z.object({ id: z.number() }),
    )(async () => {
      throw new EnvironmentError('Custom env error', 'currentUser.role')
    })

    assertEquals(await domainFunction({ id: 1 }), {
      success: false,
      errors: [],
      inputErrors: [],
      environmentErrors: [
        { message: 'Custom env error', path: ['currentUser', 'role'] },
      ],
    })
  })

  it('returns an error result when the domain function throws an ResultError', async () => {
    const domainFunction: DomainFunction<never> = makeDomainFunction(
      z.object({ id: z.number() }),
    )(async () => {
      throw new ResultError({
        errors: [],
        inputErrors: [
          { message: 'Custom input error', path: ['contact', 'id'] },
        ],
        environmentErrors: [],
      })
    })

    assertEquals(await domainFunction({ id: 1 }), {
      success: false,
      errors: [],
      inputErrors: [{ message: 'Custom input error', path: ['contact', 'id'] }],
      environmentErrors: [],
    })
  })
})

describe('all', () => {
  it('should combine two domain functions into one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id - 1,
    )

    const c: DomainFunction<[number, number]> = all(a, b)

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: [2, 0],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine many domain functions into one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(async ({ id }) =>
      String(id),
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const c = makeDomainFunction(z.object({ id: z.number() }))(async ({ id }) =>
      Boolean(id),
    )
    const d: DomainFunction<[string, number, boolean]> = all(a, b, c)

    const results = await d({ id: 1 })
    assertEquals(results, {
      success: true,
      data: ['1', 2, true],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )

    const c: DomainFunction<[number, string]> = all(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      errors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw 'Error'
    })

    const c: DomainFunction<[number, never]> = all(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )

    const c: DomainFunction<[string, string]> = all(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      environmentErrors: [],
      errors: [],
    })
  })

  it('should combine the error messages when both functions fail', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error A')
    })
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error B')
    })

    const c: DomainFunction<[never, never]> = all(a, b)

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error A' }, { message: 'Error B' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})

describe('combine', () => {
  it('should combine an object of domain functions', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id - 1,
    )

    const c: DomainFunction<{ a: number; b: number }> = combine({ a, b })

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: { a: 2, b: 0 },
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )

    const c: DomainFunction<{ a: number; b: string }> = combine({ a, b })

    assertEquals(await c({ id: 1 }), {
      success: false,
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      errors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw 'Error'
    })

    const c: DomainFunction<{ a: number; b: never }> = combine({ a, b })

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )

    const c: DomainFunction<{ a: string; b: string }> = combine({ a, b })

    assertEquals(await c({ id: 1 }), {
      success: false,
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      environmentErrors: [],
      errors: [],
    })
  })

  it('should combine the error messages when both functions fail', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error A')
    })
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error B')
    })

    const c: DomainFunction<{ a: never; b: never }> = combine({ a, b })

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [
        { message: 'Error A', exception: { message: 'Error A' } },
        { message: 'Error B', exception: { message: 'Error B' } },
      ],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})

describe('first', () => {
  it('should return the result of the first successful domain function', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(async ({ id }) =>
      String(id),
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const c = makeDomainFunction(z.object({ id: z.number() }))(async ({ id }) =>
      Boolean(id),
    )
    const d: DomainFunction<string | number | boolean> = first(a, b, c)

    const results = await d({ id: 1 })
    assertEquals(results, {
      success: true,
      data: '1',
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should return a successful result even if one of the domain functions fails', async () => {
    const a = makeDomainFunction(
      z.object({ n: z.number(), operation: z.literal('increment') }),
    )(async ({ n }) => n + 1)
    const b = makeDomainFunction(
      z.object({ n: z.number(), operation: z.literal('decrement') }),
    )(async ({ n }) => n - 1)

    const c: DomainFunction<number> = first(a, b)

    assertEquals(await c({ n: 1, operation: 'increment' }), {
      success: true,
      data: 2,
      inputErrors: [],
      errors: [],
      environmentErrors: [],
    })
  })

  it('should return error when all of the domain functions fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw 'Error'
    })

    const c: DomainFunction<string> = first(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      environmentErrors: [],
    })
  })
})

describe('merge', () => {
  it('should combine two domain functions results into one object', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ resultA: id + 1 }),
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ resultB: id - 1 }),
    )

    const c: DomainFunction<{ resultA: number; resultB: number }> = merge(a, b)

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: { resultA: 2, resultB: 0 },
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine many domain functions into one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ resultA: String(id) }),
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ resultB: id + 1 }),
    )
    const c = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ resultC: Boolean(id) }),
    )
    const d: DomainFunction<{
      resultA: string
      resultB: number
      resultC: boolean
    }> = merge(a, b, c)

    const results = await d({ id: 1 })
    assertEquals(results, {
      success: true,
      data: { resultA: '1', resultB: 2, resultC: true },
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ id }),
    )
    const b = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => ({ id }),
    )

    const c: DomainFunction<{ id: number }> = merge(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      errors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ id }),
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw 'Error'
    })

    const c: DomainFunction<never> = merge(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => ({ resultA: id }),
    )
    const b = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => ({ resultB: id }),
    )

    const c: DomainFunction<{ resultA: string; resultB: string }> = merge(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      environmentErrors: [],
      errors: [],
    })
  })

  it('should combine the error messages when both functions fail', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error A')
    })
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error B')
    })

    const c: DomainFunction<never> = merge(a, b)

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [
        { message: 'Error A', exception: { message: 'Error A' } },
        { message: 'Error B', exception: { message: 'Error B' } },
      ],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should throw an error when the results of some domain functions are not objects', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ resultB: id - 1 }),
    )

    // @ts-expect-error the inferred type is huge bc it has all properties from the number primitive
    const c: DomainFunction<number & { resultB: number }> = merge(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [
        { message: 'Invalid data format returned from some domainFunction' },
      ],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})

describe('pipe', () => {
  it('should compose domain functions from left-to-right', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({
        id: id + 2,
      }),
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id - 1,
    )

    const c: DomainFunction<number> = pipe(a, b)

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: 2,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should use the same environment in all composed functions', async () => {
    const a = makeDomainFunction(
      z.undefined(),
      z.object({ env: z.number() }),
    )(async (_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(async ({ inp }, { env }) => inp + env)

    const c: DomainFunction<number> = pipe(a, b)

    assertEquals(await c(undefined, { env: 1 }), {
      success: true,
      data: 4,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should fail on the first environment parser failure', async () => {
    const envParser = z.object({ env: z.number() })
    const a = makeDomainFunction(
      z.undefined(),
      envParser,
    )(async (_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      envParser,
    )(async ({ inp }, { env }) => inp + env)

    const c: DomainFunction<number> = pipe(a, b)

    assertEquals(await c(undefined, {}), {
      success: false,
      errors: [],
      inputErrors: [],
      environmentErrors: [{ message: 'Required', path: ['env'] }],
    })
  })

  it('should fail on the first input parser failure', async () => {
    const firstInputParser = z.undefined()

    const a = makeDomainFunction(
      firstInputParser,
      z.object({ env: z.number() }),
    )(async (_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(async ({ inp }, { env }) => inp + env)

    const c: DomainFunction<number> = pipe(a, b)

    assertEquals(await c({ inp: 'some invalid input' }, { env: 1 }), {
      success: false,
      errors: [],
      inputErrors: [
        { message: 'Expected undefined, received object', path: [] },
      ],
      environmentErrors: [],
    })
  })

  it('should fail on the second input parser failure', async () => {
    const a = makeDomainFunction(
      z.undefined(),
      z.object({ env: z.number() }),
    )(async () => ({
      inp: 'some invalid input',
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(async ({ inp }, { env }) => inp + env)

    const c: DomainFunction<number> = pipe(a, b)

    assertEquals(await c(undefined, { env: 1 }), {
      success: false,
      errors: [],
      inputErrors: [
        { message: 'Expected number, received string', path: ['inp'] },
      ],
      environmentErrors: [],
    })
  })

  it('should compose more than 2 functions', async () => {
    const a = makeDomainFunction(z.object({ aNumber: z.number() }))(
      async ({ aNumber }) => ({
        aString: String(aNumber),
      }),
    )
    const b = makeDomainFunction(z.object({ aString: z.string() }))(
      async ({ aString }) => ({
        aBoolean: aString == '1',
      }),
    )
    const c = makeDomainFunction(z.object({ aBoolean: z.boolean() }))(
      async ({ aBoolean }) => !aBoolean,
    )

    const d: DomainFunction<boolean> = pipe(a, b, c)

    assertEquals(await d({ aNumber: 1 }), {
      success: true,
      data: false,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})

describe('sequence', () => {
  it('should compose domain functions from left-to-right saving the results sequentially', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({
        id: id + 2,
      }),
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => ({ result: id - 1 }),
    )

    const c: DomainFunction<[{ id: number }, { result: number }]> = sequence(
      a,
      b,
    )

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: [{ id: 3 }, { result: 2 }],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should use the same environment in all composed functions', async () => {
    const a = makeDomainFunction(
      z.undefined(),
      z.object({ env: z.number() }),
    )(async (_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(async ({ inp }, { env }) => ({ result: inp + env }))

    const c: DomainFunction<[{ inp: number }, { result: number }]> = sequence(
      a,
      b,
    )

    assertEquals(await c(undefined, { env: 1 }), {
      success: true,
      data: [{ inp: 3 }, { result: 4 }],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should fail on the first environment parser failure', async () => {
    const envParser = z.object({ env: z.number() })
    const a = makeDomainFunction(
      z.undefined(),
      envParser,
    )(async (_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      envParser,
    )(async ({ inp }, { env }) => inp + env)

    const c: DomainFunction<[{ inp: number }, number]> = sequence(a, b)

    assertEquals(await c(undefined, {}), {
      success: false,
      errors: [],
      inputErrors: [],
      environmentErrors: [{ message: 'Required', path: ['env'] }],
    })
  })

  it('should fail on the first input parser failure', async () => {
    const firstInputParser = z.undefined()

    const a = makeDomainFunction(
      firstInputParser,
      z.object({ env: z.number() }),
    )(async (_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(async ({ inp }, { env }) => inp + env)

    const c: DomainFunction<[{ inp: number }, number]> = sequence(a, b)

    assertEquals(await c({ inp: 'some invalid input' }, { env: 1 }), {
      success: false,
      errors: [],
      inputErrors: [
        { message: 'Expected undefined, received object', path: [] },
      ],
      environmentErrors: [],
    })
  })

  it('should fail on the second input parser failure', async () => {
    const a = makeDomainFunction(
      z.undefined(),
      z.object({ env: z.number() }),
    )(async () => ({
      inp: 'some invalid input',
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(async ({ inp }, { env }) => inp + env)

    const c: DomainFunction<[{ inp: string }, number]> = sequence(a, b)

    assertEquals(await c(undefined, { env: 1 }), {
      success: false,
      errors: [],
      inputErrors: [
        { message: 'Expected number, received string', path: ['inp'] },
      ],
      environmentErrors: [],
    })
  })

  it('should compose more than 2 functions', async () => {
    const a = makeDomainFunction(z.object({ aNumber: z.number() }))(
      async ({ aNumber }) => ({
        aString: String(aNumber),
      }),
    )
    const b = makeDomainFunction(z.object({ aString: z.string() }))(
      async ({ aString }) => ({
        aBoolean: aString == '1',
      }),
    )
    const c = makeDomainFunction(z.object({ aBoolean: z.boolean() }))(
      async ({ aBoolean }) => ({ anotherBoolean: !aBoolean }),
    )

    const d: DomainFunction<
      [{ aString: string }, { aBoolean: boolean }, { anotherBoolean: boolean }]
    > = sequence(a, b, c)

    assertEquals(await d({ aNumber: 1 }), {
      success: true,
      data: [{ aString: '1' }, { aBoolean: true }, { anotherBoolean: false }],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})

describe('map', () => {
  it('returns a domain function function that will apply a function over the results of the first one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = (id: number) => id + 1

    const c: DomainFunction<number> = map(a, b)

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: 3,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns the error when the domain function fails', async () => {
    const firstInputParser = z.object({ id: z.number() })
    const a = makeDomainFunction(firstInputParser)(async ({ id }) => id + 1)
    const b = (id: number) => id + 1

    const c: DomainFunction<number> = map(a, b)

    assertEquals(await c({ invalidInput: '1' }), {
      success: false,
      errors: [],
      inputErrors: [{ message: 'Required', path: ['id'] }],
      environmentErrors: [],
    })
  })

  it('returns the error when the mapping function fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = () => {
      throw 'failed to map'
    }

    const c: DomainFunction<number> = map(a, b)

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'failed to map', exception: 'failed to map' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})

describe('mapError', () => {
  it('returns the result when the domain function suceeds', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = () =>
      ({
        errors: [{ message: 'New Error Message' }],
        inputErrors: [{ message: 'New Input Error Message' }],
      } as ErrorData)

    const c: DomainFunction<number> = mapError(a, b)

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: 2,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns a domain function function that will apply a function over the error of the first one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = (result: ErrorData) =>
      ({
        errors: [{ message: 'Number of errors: ' + result.errors.length }],
        environmentErrors: [],
        inputErrors: [
          {
            message: 'Number of input errors: ' + result.inputErrors.length,
            path: [],
          },
        ],
      } as ErrorData)

    const c: DomainFunction<number> = mapError(a, b)

    assertEquals(await c({ invalidInput: '1' }), {
      success: false,
      errors: [{ message: 'Number of errors: 0' }],
      environmentErrors: [],
      inputErrors: [{ message: 'Number of input errors: 1', path: [] }],
    })
  })

  it('returns the error when the mapping function fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = () => {
      throw 'failed to map'
    }

    const c: DomainFunction<number> = mapError(a, b)

    assertEquals(await c({ invalidInput: '1' }), {
      success: false,
      errors: [{ message: 'failed to map', exception: 'failed to map' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})

describe('fromSuccess', () => {
  it('returns the result.data when the domain function suceeds', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )

    const c: (input?: unknown, environment?: unknown) => Promise<number> =
      fromSuccess(a)

    assertEquals(await c({ id: 1 }), 2)
  })

  it('throws an exception when the domain function fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )

    const c: (input?: unknown, environment?: unknown) => Promise<number> =
      fromSuccess(a)

    assertRejects(async () => {
      await c({ invalidInput: 'should error' })
    }, ResultError)
  })
})

describe('trace', () => {
  it('intercepts inputs and outputs of a given domain function', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )

    let contextFromFunctionA: {
      input: unknown
      environment: unknown
      result: unknown
    } | null = null

    const c: DomainFunction<number> = trace((context) => {
      contextFromFunctionA = context
    })(a)

    assertEquals(await fromSuccess(c)({ id: 1 }), 2)
    assertEquals(contextFromFunctionA, {
      input: { id: 1 },
      environment: undefined,
      result: {
        success: true,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
        data: 2,
      },
    })
  })
})
