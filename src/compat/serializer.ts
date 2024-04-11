import { EnvironmentError, InputError } from '../errors.ts'
import { toErrorPayload } from '../serializer.ts'
import { Result } from '../types.ts'
import { SerializedResult } from './types.ts'

const isInputError = (error: Error): error is InputError =>
  error instanceof InputError

const isEnvironmentError = (error: Error): error is EnvironmentError =>
  error instanceof EnvironmentError

function serialize<T>(result: Result<T>): SerializedResult<T> {
  if (result.success) {
    return {
      ...result,
      inputErrors: [],
      environmentErrors: [],
    }
  }

  return {
    success: false,
    errors: result.errors
      .filter(
        (e) => !(e instanceof InputError) && !(e instanceof EnvironmentError),
      )
      .map(toErrorPayload),
    inputErrors: result.errors.filter(isInputError).map(toErrorPayload),
    environmentErrors: result.errors
      .filter(isEnvironmentError)
      .map(toErrorPayload),
  }
}

export { serialize }
