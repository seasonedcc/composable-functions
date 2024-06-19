import { assertEquals, describe, it } from './prelude.ts'
import {
  EnvironmentError,
  failure,
  InputError,
  serializeError,
  success,
} from '../index.ts'
import type { SerializableError } from '../types.ts'
import { serialize } from '../index.ts'
import type { SerializableResult } from '../types.ts'

describe('serializeError', () => {
  it('serializes an error into a payload friendly format', () => {
    const result = serializeError(new Error('Oops!'))
    type _T = Expect<Equal<typeof result, SerializableError>>

    assertEquals(result, {
      message: 'Oops!',
      exception: new Error('Oops!'),
      name: 'Error',
      path: [],
    })
  })

  it('serializes custom errors', () => {
    class MyCustomError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'MyCustomError'
      }
    }
    const result = serializeError(new MyCustomError('Oops!'))

    assertEquals(result, {
      message: 'Oops!',
      exception: new MyCustomError('Oops!'),
      name: 'MyCustomError',
      path: [],
    })
  })

  it('serializes InputError and EnvironmentError properly', () => {
    const inputError = new InputError('Oops!', ['foo', 'bar'])

    const result = serializeError(inputError)

    assertEquals(result, {
      message: 'Oops!',
      exception: inputError,
      name: 'InputError',
      path: ['foo', 'bar'],
    })
  })

  it('defaults path to empty list', () => {
    const environmentError = new EnvironmentError('Oops!')

    const result = serializeError(environmentError)

    assertEquals(result, {
      message: 'Oops!',
      exception: environmentError,
      name: 'EnvironmentError',
      path: [],
    })
  })
})

describe('serialize', () => {
  it('serializes a successfull result properly', () => {
    const result = serialize(success('Hello!'))
    type _T = Expect<Equal<typeof result, SerializableResult<'Hello!'>>>

    assertEquals(result, { success: true, data: 'Hello!', errors: [] })
  })

  it('serializes a failed result properly', () => {
    const result = serialize(
      failure([
        new Error('Oops!'),
        new InputError('Required'),
        new EnvironmentError('Not found', ['user', 'name']),
      ]),
    )

    type _T = Expect<Equal<typeof result, SerializableResult<unknown>>>

    assertEquals(result, {
      success: false,
      errors: [
        {
          message: 'Oops!',
          exception: new Error('Oops!'),
          name: 'Error',
          path: [],
        },
        {
          message: 'Required',
          exception: new InputError('Required'),
          name: 'InputError',
          path: [],
        },
        {
          message: 'Not found',
          exception: new EnvironmentError('Not found', ['user', 'name']),
          name: 'EnvironmentError',
          path: ['user', 'name'],
        },
      ],
    })
  })
})
