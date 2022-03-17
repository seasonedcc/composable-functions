import {describe, it, expect } from 'vitest'
import { Request } from '@remix-run/node'

import * as z from 'zod'
import * as subject from './index'

const makePost: (entries: Array<[string, string]>, url?: string) => Request = (
  entries,
  url = 'http://localhost/test',
) =>
  new Request(url, {
    method: 'POST',
    body: new URLSearchParams(entries).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

const makeGet: (entries: Array<[string, string]>, url?: string) => Request = (
  entries,
  url = 'http://localhost/test',
) =>
  new Request(url + '?' + new URLSearchParams(entries).toString(), {
    method: 'GET',
  })

describe('makeDomainFunction', () => {
  describe('when it has no environment', () => {
    it('uses zod parser to create parse the input and call the domain function', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })

      const handler = subject.makeDomainFunction(parser)(async ({ id }) => id)

      expect(await handler({ id: '1' })).toEqual({ success: true, data: 1 })
    })

    it('returns error when parsing fails', async () => {
      const parser = z.object({ id: z.preprocess(Number, z.number()) })
      const body = { missingId: '1' }
      const expectedError = parser.safeParse({
        body,
      }) as z.SafeParseError<{ id: number }>

      const handler = subject.makeDomainFunction(parser)(async ({ id }) => id)

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

    const handler = subject.makeDomainFunction(
      parser,
      envParser,
    )(async ({ id }, { uid }) => [id, uid])

    expect(await handler({ id: '1' }, { uid: '2' })).toEqual({
      success: true,
      data: [1, 2],
    })
  })

  it('returns error when environment parsing fails', async () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const envParser = z.object({ uid: z.preprocess(Number, z.number()) })
    const expectedError = envParser.safeParse({}) as z.SafeParseError<{
      uid: number
    }>

    const handler = subject.makeDomainFunction(
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

describe('formatErrors', () => {
  it('takes an error result with input errors and return them', () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const body = { missingId: '1' }
    const errorResult = parser.safeParse({
      body,
    }) as z.SafeParseError<{ id: number }>

    const result = subject.formatErrors({
      success: false,
      errors: [],
      inputErrors: errorResult.error.issues,
    })

    expect(result).toHaveProperty('inputErrors', errorResult.error.issues)
  })

  it('takes an error result with errors and return just a global error message', () => {
    const result = subject.formatErrors({
      success: false,
      errors: [{ message: 'some error message' }],
      inputErrors: [],
    })

    expect(result).toHaveProperty('error', 'some error message')
  })
})

describe('inputFromForm', () => {
  it("extracts the input values from a Request's FormData as an Object", async () => {
    const request = makePost([
      ['foo', 'bar'],
      ['fizz', 'buzz'],
    ])
    expect(await subject.inputFromForm(request)).toEqual({
      foo: 'bar',
      fizz: 'buzz',
    })
  })

  it('accepts array-like values', async () => {
    const request = makePost([
      ['foo', 'bar'],
      ['arr[]', '1'],
      ['arr[]', '2'],
    ])
    expect(await subject.inputFromForm(request)).toEqual({
      foo: 'bar',
      arr: ['1', '2'],
    })
  })

  it('accepts structured values', async () => {
    const request = makePost([
      ['person[0][name]', 'John'],
      ['person[0][email]', 'john@email.com'],
      ['person[1][name]', 'Bill'],
      ['person[1][email]', 'bill@email.com'],
    ])
    expect(await subject.inputFromForm(request)).toEqual({
      person: [
        { name: 'John', email: 'john@email.com' },
        { name: 'Bill', email: 'bill@email.com' },
      ],
    })
  })
})

describe('inputFromUrl', () => {
  it("extracts the input values from a Request's URL as an Object", () => {
    const request = makeGet([
      ['foo', 'bar'],
      ['fizz', 'buzz'],
    ])
    expect(subject.inputFromUrl(request)).toEqual({ foo: 'bar', fizz: 'buzz' })
  })

  it('accepts array-like values', async () => {
    const request = makeGet([
      ['foo', 'bar'],
      ['arr[]', '1'],
      ['arr[]', '2'],
    ])
    expect(await subject.inputFromUrl(request)).toEqual({
      foo: 'bar',
      arr: ['1', '2'],
    })
  })

  it('accepts structured values', async () => {
    const request = makeGet([
      ['person[0][name]', 'John'],
      ['person[0][email]', 'john@email.com'],
      ['person[1][name]', 'Bill'],
      ['person[1][email]', 'bill@email.com'],
    ])
    expect(await subject.inputFromUrl(request)).toEqual({
      person: [
        { email: 'john@email.com', name: 'John' },
        { name: 'Bill', email: 'bill@email.com' },
      ],
    })
  })
})
