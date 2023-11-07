import { Failure } from './atmp/types.ts'
import type {
  AtLeastOne,
  ErrorData,
  ErrorResult,
  SchemaError,
} from './types.ts'

/**
 * Creates a SchemaError (used in inputErrors and environmentErrors) from the given message and path.
 * @param message the error message
 * @param path the path to the property that caused the error
 * @returns the SchemaError
 */
function schemaError(message: string, path: string): SchemaError {
  return { message, path: path.split('.') }
}

/**
 * Extracts the error messages for a property from the given ErrorResult.
 * @param errors the ErrorResult['inputErrors'] or ErrorResult['environmentErrors']
 * @param name the name of the property
 * @returns string[] the error messages for the given property
 */
function errorMessagesFor(errors: SchemaError[], name: string) {
  return errors
    .filter(({ path }) => path.join('.') === name)
    .map(({ message }) => message)
}

/**
 * A custom error class for input errors.
 * @example
 * const df = mdf()(() => {
 *   throw new InputError('Invalid input', 'user.name')
 * })
 */
class InputError extends Error {
  path: string

  constructor(message: string, path: string) {
    super(message)
    this.name = 'InputError'
    this.path = path
  }
}

class InputErrors extends Error {
  errors: { message: string; path: string }[]

  constructor(errors: { message: string; path: string }[]) {
    super(`${errors.length} errors`)
    this.errors = errors
  }
}

/**
 * A custom error class for environment errors.
 * @example
 * const df = mdf()(() => {
 *  throw new EnvironmentError('Invalid environment', 'user.name')
 * })
 */
class EnvironmentError extends Error {
  path: string

  constructor(message: string, path: string) {
    super(message)
    this.name = 'EnvironmentError'
    this.path = path
  }
}

/**
 * A custom error class for creating ErrorResult.
 * @example
 * const df = mdf()(() => {
 *   throw new ResultError({
 *     errors: [{ message: 'Some error' }],
 *     inputErrors: [{ message: 'Some input error', path: 'user.name' }],
 *   })
 * })
 */
class ResultError extends Error {
  result: ErrorResult

  constructor(result: AtLeastOne<ErrorData>) {
    super('ResultError')
    this.name = 'ResultError'
    this.result = {
      errors: [],
      inputErrors: [],
      environmentErrors: [],
      ...result,
      success: false,
    }
  }
}

function failureToErrorResult({ errors }: Failure): ErrorResult {
  return {
    success: false,
    errors: errors
      .filter(
        ({ exception }) =>
          !(
            exception instanceof InputError ||
            exception instanceof InputErrors ||
            exception instanceof EnvironmentError
          ),
      )
      .flatMap((e) =>
        e.exception instanceof ResultError ? e.exception.result.errors : e,
      ),
    inputErrors: errors.flatMap(({ exception }) =>
      exception instanceof InputError
        ? [
            {
              path: exception.path.split('.'),
              message: exception.message,
            },
          ]
        : exception instanceof InputErrors
        ? exception.errors.map((e) => ({
            path: e.path.split('.'),
            message: e.message,
          }))
        : exception instanceof ResultError
        ? exception.result.inputErrors
        : [],
    ),
    environmentErrors: errors.flatMap(({ exception }) =>
      exception instanceof EnvironmentError
        ? [
            {
              path: exception.path.split('.'),
              message: exception.message,
            },
          ]
        : exception instanceof ResultError
        ? exception.result.environmentErrors
        : [],
    ),
  }
}

export {
  EnvironmentError,
  errorMessagesFor,
  failureToErrorResult,
  InputError,
  InputErrors,
  ResultError,
  schemaError,
}

