import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import {
  assertEquals,
  assertObjectMatch,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import { makeDomainFunction } from './constructor.ts'
import {
  EnvironmentError,
  ResultError,
  InputError,
  InputErrors,
} from './errors.ts'
import type { DomainFunction, SuccessResult } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('makeDomainFunction', () => {
  describe('when it has no input', async () => {
    const handler = makeDomainFunction()(() => 'no input!')
    type _R = Expect<Equal<typeof handler, DomainFunction<string>>>

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

      const handler = makeDomainFunction(parser)(({ id }) => id)
      type _R = Expect<Equal<typeof handler, DomainFunction<number>>>

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
      const handler = makeDomainFunction(parser)(({ id }) => id)
      type _R = Expect<Equal<typeof handler, DomainFunction<number>>>

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

    const handler = makeDomainFunction(
      parser,
      envParser,
    )(({ id }, { uid }) => [id, uid] as const)
    type _R = Expect<
      Equal<typeof handler, DomainFunction<readonly [number, number]>>
    >

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
        .refine((value) => value !== 1, { message: 'ID already taken' }),
    })

    const envParser = z.object({
      uid: z
        .preprocess(Number, z.number())
        .refine((value) => value !== 2, { message: 'UID already taken' }),
    })

    const handler = makeDomainFunction(
      parser,
      envParser,
    )(({ id }, { uid }) => [id, uid])
    type _R = Expect<Equal<typeof handler, DomainFunction<number[]>>>

    assertEquals(await handler({ id: '1' }, { uid: '2' }), {
      success: false,
      errors: [],
      inputErrors: [{ message: 'ID already taken', path: ['id'] }],
      environmentErrors: [{ message: 'UID already taken', path: ['uid'] }],
    })
  })

  it('accepts literals as input of domain functions', async () => {
    const handler = makeDomainFunction(z.number(), z.string())((n) => n + 1)
    type _R = Expect<Equal<typeof handler, DomainFunction<number>>>

    const result = await handler(1, 'not going to be used')
    assertEquals((result as SuccessResult<number>).data, 2)
  })

  it('accepts sync functions', async () => {
    const handler = makeDomainFunction(z.number())((n) => n + 1)
    type _R = Expect<Equal<typeof handler, DomainFunction<number>>>

    const result = await handler(1)
    assertEquals((result as SuccessResult<number>).data, 2)
  })

  it('returns error when environment parsing fails', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const envParser = z.object({ uid: z.preprocess(Number, z.number()) })

    const handler = makeDomainFunction(
      parser,
      envParser,
    )(({ id }, { uid }) => [id, uid])
    type _R = Expect<Equal<typeof handler, DomainFunction<number[]>>>

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
    const handler = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw new Error('Error')
    })
    type _R = Expect<Equal<typeof handler, DomainFunction<never>>>

    assertObjectMatch(await handler({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('preserves entire original exception when the domain function throws an Error', async () => {
    const handler = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw new Error('Some message', { cause: { someUnknownFields: true } })
    })
    type _R = Expect<Equal<typeof handler, DomainFunction<never>>>

    assertObjectMatch(await handler({ id: 1 }), {
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
    const handler = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })
    type _R = Expect<Equal<typeof handler, DomainFunction<never>>>

    assertObjectMatch(await handler({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns error when the domain function throws an object with message', async () => {
    const handler = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw { message: 'Error' }
    })
    type _R = Expect<Equal<typeof handler, DomainFunction<never>>>

    assertEquals(await handler({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: { message: 'Error' } }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns inputErrors when the domain function throws an InputError', async () => {
    const handler = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw new InputError('Custom input error', 'contact.id')
    })
    type _R = Expect<Equal<typeof handler, DomainFunction<never>>>

    assertEquals(await handler({ id: 1 }), {
      success: false,
      errors: [],
      inputErrors: [{ message: 'Custom input error', path: ['contact', 'id'] }],
      environmentErrors: [],
    })
  })

  it('returns multiple inputErrors when the domain function throws an InputErrors', async () => {
    const handler = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw new InputErrors([
        { message: 'Custom input error', path: 'contact.id' },
        { message: 'Another input error', path: 'contact.id' },
      ])
    })
    type _R = Expect<Equal<typeof handler, DomainFunction<never>>>

    assertEquals(await handler({ id: 1 }), {
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
    const handler = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw new EnvironmentError('Custom env error', 'currentUser.role')
    })
    type _R = Expect<Equal<typeof handler, DomainFunction<never>>>

    assertEquals(await handler({ id: 1 }), {
      success: false,
      errors: [],
      inputErrors: [],
      environmentErrors: [
        { message: 'Custom env error', path: ['currentUser', 'role'] },
      ],
    })
  })

  it('returns an error result when the domain function throws an ResultError', async () => {
    const handler = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw new ResultError({
        errors: [],
        inputErrors: [
          { message: 'Custom input error', path: ['contact', 'id'] },
        ],
        environmentErrors: [],
      })
    })
    type _R = Expect<Equal<typeof handler, DomainFunction<never>>>

    assertEquals(await handler({ id: 1 }), {
      success: false,
      errors: [],
      inputErrors: [{ message: 'Custom input error', path: ['contact', 'id'] }],
      environmentErrors: [],
    })
  })
})
