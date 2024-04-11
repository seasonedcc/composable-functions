import { EnvironmentError } from './errors.ts'
import { InputError } from './errors.ts'
import type { Result, SerializableError, SerializedResult } from './types.ts'

function toErrorPayload<T extends Error>(error: T): SerializableError<T> {
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

function serialize<T>(result: Result<T>): SerializedResult<T> {
  if (result.success) return result

  return { success: false, errors: result.errors.map(toErrorPayload) }
}

export { serialize, toErrorPayload }
