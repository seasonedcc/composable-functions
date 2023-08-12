import { describe, it, assertEquals } from './test-prelude.ts'
import { z } from 'npm:zod@3.21.4'

import { errorMessagesFor, schemaError } from './errors.ts'

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

  it('returns a list of error messages for a deep property of the formData', () => {
    const err = [{ path: ['person', '0', 'email'], message: 'Invalid email' }]
    assertEquals(errorMessagesFor(err, 'person.0.email'), ['Invalid email'])
  })
})
