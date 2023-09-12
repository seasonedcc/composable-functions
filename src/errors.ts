import type {
  ErrorWithMessage,
  SchemaError,
  ErrorResult,
  ErrorData,
  AtLeastOne,
} from './types.ts'

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

/**
 * Turns the given 'unknown' error into an ErrorWithMessage.
 * @param maybeError the error to turn into an ErrorWithMessage
 * @returns the ErrorWithMessage
 * @example
 * try {}
 * catch (error) {
 *   const errorWithMessage = toErrorWithMessage(error)
 *   console.log(errorWithMessage.message)
 * }
 */
function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  const message = isErrorWithMessage(maybeError)
    ? maybeError.message
    : String(maybeError)
  return {
    message,
    exception: maybeError,
  }
}

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

export {
  errorMessagesFor,
  schemaError,
  toErrorWithMessage,
  InputError,
  EnvironmentError,
  InputErrors,
  ResultError,
}
