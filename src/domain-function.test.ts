import { describe, it, expect } from 'vitest'
import * as z from 'zod'

import { compose, makeDomainFunction } from './domain-functions'

describe('makeDomainFunction', () => {
  describe('when it has no environment', () => {
    it('uses zod parser to create parse the input and call the domain function', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })

      const handler = makeDomainFunction(parser)(async ({ id }) => id)

      expect(await handler({ id: '1' })).toEqual({
        success: true,
        data: 1,
        errors: [],
        inputErrors: [],
      })
    })

    it('returns error when parsing fails', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })
      const body = { missingId: '1' }
      const expectedError = parser.safeParse({
        body,
      }) as z.SafeParseError<{ id: number }>

      const handler = makeDomainFunction(parser)(async ({ id }) => id)

      expect(await handler({ missingId: '1' })).toEqual({
        success: false,
        inputErrors: expectedError.error.issues,
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
    )(async ({ id }, { uid }) => [id, uid])

    expect(await handler({ id: '1' }, { uid: '2' })).toEqual({
      success: true,
      data: [1, 2],
      errors: [],
      inputErrors: [],
    })
  })

  it('returns error when environment parsing fails', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const envParser = z.object({ uid: z.preprocess(Number, z.number()) })
    const expectedError = envParser.safeParse({}) as z.SafeParseError<{
      uid: number
    }>

    const handler = makeDomainFunction(
      parser,
      envParser,
    )(async ({ id }, { uid }) => [id, uid])

    expect(await handler({ id: '1' }, {})).toEqual({
      success: false,
      inputErrors: [],
      errors: expectedError.error.issues,
    })
  })
})

describe('compose', () => {
  it('should compose two domain functions into one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id + 1,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id - 1,
    )

    const c = compose(a, b)

    expect(await c({ id: 1 })).toEqual({
      success: true,
      data: [2, 0],
      errors: [],
      inputErrors: [],
    })
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )

    const c = compose(a, b)

    expect(await c({ id: 1 })).toEqual({
      success: false,
      inputErrors: [
        {
          code: 'invalid_type',
          expected: 'string',
          message: 'Expected string, received number',
          path: ['id'],
          received: 'number',
        },
      ],
      errors: [],
    })
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error')
    })

    const c = compose(a, b)

    expect(await c({ id: 1 })).toEqual({
      success: false,
      errors: [{ message: 'Error' }],
      inputErrors: [],
    })
  })

  it('should compose the inputError messages of both functions', async () => {
    const a = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )
    const b = makeDomainFunction(z.object({ id: z.string() }))(
      async ({ id }) => id,
    )

    const c = compose(a, b)

    expect(await c({ id: 1 })).toEqual({
      success: false,
      inputErrors: [
        {
          code: 'invalid_type',
          expected: 'string',
          message: 'Expected string, received number',
          path: ['id'],
          received: 'number',
        },
        {
          code: 'invalid_type',
          expected: 'string',
          message: 'Expected string, received number',
          path: ['id'],
          received: 'number',
        },
      ],
      errors: [],
    })
  })

  it('should compose the error messages when both functions fail', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error A')
    })
    const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
      throw new Error('Error B')
    })

    const c = compose(a, b)

    expect(await c({ id: 1 })).toEqual({
      success: false,
      errors: [{ message: 'Error A' }, { message: 'Error B' }],
      inputErrors: [],
    })
  })
})
