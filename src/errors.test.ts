import { describe, it, expect } from 'vitest'
import * as z from 'zod'

import { errorMessagesFor, errorMessagesForSchema } from './errors'

const errors = [
  { path: ['a'], message: 'a' },
  { path: ['b'], message: 'b' },
  { path: ['b'], message: 'c' },
]

describe('errorMessagesFor', () => {
  it('returns one SchemaError for a given name', () => {
    expect(errorMessagesFor(errors, 'b')).toEqual(['b', 'c'])
  })

  it('returns null if a SchemaError can not be found for the given name', () => {
    expect(errorMessagesFor(errors, 'c')).toEqual([])
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
