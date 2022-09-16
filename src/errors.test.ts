import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import { assertEquals } from 'https://deno.land/std@0.117.0/testing/asserts.ts'
import { z } from 'https://deno.land/x/zod/mod.ts'

import { makeDomainFunction } from './domain-functions.ts'

import {
  errorMessagesFor,
  errorMessagesForSchema,
  schemaError,
} from './errors.ts'

const errors = [
  { path: ['a'], message: 'a' },
  { path: ['b'], message: 'b' },
  { path: ['b'], message: 'c' },
]

describe('schemaError', () => {
  it('returns a SchemaError from a message and a path using dot notation', () => {
    assertEquals(schemaError('this is an error message', 'b.c'), {
      message: 'this is an error message',
      path: ['b', 'c'],
    })
  })
})

describe('errorMessagesFor', () => {
  it('returns a list of error messages for a given name', () => {
    assertEquals(errorMessagesFor(errors, 'b'), ['b', 'c'])
  })

  it('returns an empty list if no error messages can be found', () => {
    assertEquals(errorMessagesFor(errors, 'c'), [])
  })

  it('returns a list of error messages for a deep property of the formData', async () => {
    const err = [{ path: ['person', '0', 'email'], message: 'Invalid email' }]
    assertEquals(errorMessagesFor(err, 'person.0.email'), ['Invalid email'])
  })
})

const schema = z.object({
  a: z.string(),
  b: z.string(),
})
describe('errorMessagesForSchema', () => {
  it('returns an object with error messages for every key of the given schema', () => {
    assertEquals(errorMessagesForSchema(errors, schema), {
      a: ['a'],
      b: ['b', 'c'],
    })
  })

  it('has type inference for the results of this function', () => {
    assertEquals(errorMessagesForSchema(errors, schema).a, ['a'])
  })

  it('handles nested data errors', async () => {
    const data = {
      a: 'bar',
      b: 'foo',
      c: {
        c1: 'c1 foo',
        c2: 'c2 bar',
      },
      d: {
        d1: 'd1 foo',
        d2: 'd2 bar',
      },
    }

    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.object({
        c1: z.string(),
        c2: z.array(z.string()),
      }),
      d: z.object({
        d1: z.object({
          d1a: z.string(),
          d1b: z.number(),
        }),
        d2: z.array(z.string()),
      }),
    })
    const domainFn = makeDomainFunction(schema)(async (data) => data)
    const result = await domainFn(data)

    const errors = errorMessagesForSchema(result.inputErrors, schema)
    assertEquals(errors, {
      c: { c2: ['Expected array, received string'] },
      d: {
        d1: ['Expected object, received string'],
        d2: ['Expected array, received string'],
      },
    })
  })

  it('handles nested data errors inside arrays of strings', async () => {
    const data = {
      a: 'bar',
      b: 'foo',
      c: {
        c1: 'c1 foo',
        c2: ['c2 bar', 6, { foo: 'test' }],
      },
      d: {
        d1: 'd1 foo',
        d2: 'd2 bar',
      },
    }

    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.object({
        c1: z.string(),
        c2: z.array(z.string()),
      }),
      d: z.object({
        d1: z.object({
          d1a: z.string(),
          d1b: z.number(),
        }),
        d2: z.array(z.string()),
      }),
    })
    const domainFn = makeDomainFunction(schema)(async (data) => data)
    const result = await domainFn(data)

    const errors = errorMessagesForSchema(result.inputErrors, schema)
    assertEquals(errors, {
      c: {
        c2: {
          '1': ['Expected string, received number'],
          '2': ['Expected string, received object'],
        },
      },
      d: {
        d1: ['Expected object, received string'],
        d2: ['Expected array, received string'],
      },
    })
  })

  it('handles nested data errors inside arrays of objects', async () => {
    const data = {
      a: 'bar',
      b: 'foo',
      c: {
        c1: 'c1 foo',
        c2: ['c2 bar', { c2a: 'test' }, { c2a: 1 }],
      },
      d: {
        d1: 'd1 foo',
        d2: 'd2 bar',
      },
    }

    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.object({
        c1: z.string(),
        c2: z.array(z.object({ c2a: z.number() })),
      }),
      d: z.object({
        d1: z.object({
          d1a: z.string(),
          d1b: z.number(),
        }),
        d2: z.array(z.string()),
      }),
    })
    const domainFn = makeDomainFunction(schema)(async (data) => data)
    const result = await domainFn(data)

    const errors = errorMessagesForSchema(result.inputErrors, schema)
    assertEquals(errors, {
      c: {
        c2: {
          '0': ['Expected object, received string'],
          '1': { c2a: ['Expected number, received string'] },
        },
      },
      d: {
        d1: ['Expected object, received string'],
        d2: ['Expected array, received string'],
      },
    })
  })
})
