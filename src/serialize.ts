import { EnvironmentError } from './errors.ts'
import { InputError } from './errors.ts'
import type { Result } from './types.ts'
import { Failure } from './types.ts'
import { Success } from './types.ts'

function serializeResult<T>(result: Result<T>):
  | (Success<T> & { inputErrors: []; environmentErrors: [] })
  | (Failure & {
      inputErrors: Error[]
      environmentErrors: Error[]
    }) {
  if (result.success) {
    return {
      ...result,
      inputErrors: [],
      environmentErrors: [],
    }
  }

  return {
    success: false,
    errors: result.errors.filter(
      (e) => !(e instanceof InputError) && !(e instanceof EnvironmentError),
    ),
    inputErrors: result.errors.filter((e) => e instanceof InputError),
    environmentErrors: result.errors.filter(
      (e) => e instanceof EnvironmentError,
    ),
  }
}

export { serializeResult }
