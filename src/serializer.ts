import { EnvironmentError } from './errors.ts'
import { InputError } from './errors.ts'
import type { Result, SerializableError, SerializedResult } from './types.ts'

function deserializeError(serializedError: SerializableError): Error {
  if (serializedError.name === 'InputError')
    return new InputError(serializedError.message, serializedError.path)
  if (serializedError.name === 'EnvironmentError')
    return new EnvironmentError(serializedError.message, serializedError.path)

  return new Error(serializedError.message)
}

function serializeError(error: Error): SerializableError {
  if (error instanceof InputError || error instanceof EnvironmentError) {
    return {
      exception: error,
      message: error.message,
      name: error.name,
      path: error.path,
    }
  }
  return {
    exception: error,
    message: error.message,
    name: error.name,
    path: [],
  }
}

function deserialize<T>(result: SerializedResult<T>): Result<T> {
  if (result.success) return result

  return { success: false, errors: result.errors.map(deserializeError) }
}

function serialize<T>(result: Result<T>): SerializedResult<T> {
  if (result.success) return result

  return { success: false, errors: result.errors.map(serializeError) }
}

export { deserialize, deserializeError, serialize, serializeError }
