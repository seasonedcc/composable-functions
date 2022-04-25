import { describe, it, expect } from 'vitest'
import * as z from 'zod'

import { errorMessagesFor, errorMessagesForSchema, schemaError } from './errors'

const errors = [
  { path: ['a'], message: 'a' },
  { path: ['b'], message: 'b' },
  { path: ['b'], message: 'c' },
]

describe('schemaError', () => {
  it('returns a SchemaError from a message and a path using dot notation', () => {
    expect(schemaError('this is an error message', 'b.c')).toEqual({
      message: 'this is an error message',
      path: ['b', 'c'],
    })
  })
})

describe('errorMessagesFor', () => {
  it('returns a list of error messages for a given name', () => {
    expect(errorMessagesFor(errors, 'b')).toEqual(['b', 'c'])
  })

  it('returns an empty list if no error messages can be found', () => {
    expect(errorMessagesFor(errors, 'c')).toEqual([])
  })

  it('returns a list of error messages for a deep property of the formData', async () => {
    const err = [{ path: ['person', '0', 'email'], message: 'Invalid email' }]
    expect(errorMessagesFor(err, 'person.0.email')).toEqual(['Invalid email'])
  })
})

const schema = z.object({
  a: z.string(),
  b: z.string(),
})
describe('errorMessagesForSchema', () => {
  it('returns an object with error messages for every key of the given schema', () => {
    expect(errorMessagesForSchema(errors, schema)).toEqual({
      a: ['a'],
      b: ['b', 'c'],
    })
  })

  it('has type inference for the results of this function', () => {
    expect(errorMessagesForSchema(errors, schema).a).toEqual(['a'])
  })
})
