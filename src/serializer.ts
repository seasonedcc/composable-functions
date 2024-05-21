import { EnvironmentError } from './errors.ts'
import { InputError } from './errors.ts'
import type { Result, SerializableError, SerializableResult } from './types.ts'

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

function serialize<T>(result: Result<T>): SerializableResult<T> {
  if (result.success) return result

  return { success: false, errors: result.errors.map(serializeError) }
}

export { serialize, serializeError }
