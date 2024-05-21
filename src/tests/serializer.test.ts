import { assertEquals, describe, it } from './prelude.ts'
import {
  deserializeError,
  deserialize,
  serializeError,
  failure,
  success,
  InputError,
  EnvironmentError,
} from '../index.ts'
import { Result, SerializableError } from '../types.ts'
import { serialize } from '../index.ts'
import { SerializedResult } from '../types.ts'

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
    type _T = Expect<Equal<typeof result, SerializedResult<'Hello!'>>>

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

    type _T = Expect<Equal<typeof result, SerializedResult<unknown>>>

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

describe('deserializeError', () => {
  it('deserializes a SerializableError', () => {
    const err: Partial<SerializableError> = {
      message: 'Oops',
      name: 'Error',
      path: [],
    }
    const result = deserializeError(err as SerializableError)
    type _T = Expect<Equal<typeof result, Error>>

    assertEquals(result.message, 'Oops')
    assertEquals('path' in result, false)
    assertEquals(result instanceof Error, true)
    assertEquals(result instanceof InputError, false)
    assertEquals(result instanceof EnvironmentError, false)
  })

  it('deserializes an InputError', () => {
    const err = serializeError(new InputError('Required', ['name']))
    const result = deserializeError(err)

    assertEquals(result.message, 'Required')
    assertEquals('path' in result && result.path, ['name'])
    assertEquals(result instanceof Error, true)
    assertEquals(result instanceof InputError, true)
    assertEquals(result instanceof EnvironmentError, false)
  })

  it('deserializes an EnvironmentError', () => {
    const err = serializeError(
      new EnvironmentError('Not found', ['user', 'name']),
    )
    const result = deserializeError(err)

    assertEquals(result.message, 'Not found')
    assertEquals('path' in result && result.path, ['user', 'name'])
    assertEquals(result instanceof Error, true)
    assertEquals(result instanceof InputError, false)
    assertEquals(result instanceof EnvironmentError, true)
  })

  it('deserializes a custom error', () => {
    class MyCustomError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'MyCustomError'
      }
    }

    const err = serializeError(new MyCustomError('Custom error'))
    const result = deserializeError(err)

    assertEquals(result.message, 'Custom error')
    assertEquals(result instanceof Error, true)
    assertEquals(result instanceof InputError, false)
    assertEquals(result instanceof EnvironmentError, false)
  })
})

describe('deserialize', () => {
  it('deserializes a successfull SerializedResult properly', () => {
    const result = success('Hello!')
    const serialized = serialize(result)
    const deserialized = deserialize(serialized)
    type _T = Expect<Equal<typeof deserialized, Result<'Hello!'>>>

    assertEquals(deserialized, result)
  })

  it('deserializes a failed SerializedResult properly', () => {
    const result = failure([
      new Error('Oops!'),
      new InputError('Required'),
      new EnvironmentError('Not found', ['user', 'name']),
    ])
    const serialized = serialize(result)
    const deserialized = deserialize(serialized)

    type _T = Expect<Equal<typeof deserialized, Result<unknown>>>

    assertEquals(deserialized, result)
  })
})
