import type { ErrorData, ErrorResult, SchemaError } from './types.ts'

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

  constructor(result: Pick<ErrorResult, 'errors'>) {
    super('ResultError')
    this.name = 'ResultError'
    this.result = makeErrorResult(result)
  }
}

// function schemaErrorToError(se: SchemaError): Error {
//   const message = `${se.path.join('.')} ${se.message}`.trim()
//   return new Error(message)
// }

// function failureToErrorResult({ errors }: Failure): ErrorResult {
//   return makeErrorResult({
//     errors: errors
//       .filter(
//         (exception) =>
//           !(
//             exception instanceof InputError ||
//             exception instanceof InputErrors ||
//             exception instanceof EnvironmentError
//           ),
//       )
//       .flatMap((e) => (e instanceof ResultError ? e.result.errors : e)),
//     inputErrors: errors.flatMap((exception) =>
//       exception instanceof InputError
//         ? [
//             {
//               path: exception.path.split('.'),
//               message: exception.message,
//             },
//           ]
//         : exception instanceof InputErrors
//         ? exception.errors.map((e) => ({
//             path: e.path.split('.'),
//             message: e.message,
//           }))
//         : exception instanceof ResultError
//         ? exception.result.inputErrors
//         : [],
//     ),
//     environmentErrors: errors.flatMap((exception) =>
//       exception instanceof EnvironmentError
//         ? [
//             {
//               path: exception.path.split('.'),
//               message: exception.message,
//             },
//           ]
//         : exception instanceof ResultError
//         ? exception.result.environmentErrors
//         : [],
//     ),
//   })
// }

function makeErrorResult({ errors }: Pick<ErrorData, 'errors'>): ErrorResult {
  return {
    success: false,
    errors,
  }
}

function objectHasKey<T extends string>(
  obj: unknown,
  key: T,
): obj is { [k in T]: unknown } {
  return typeof obj === 'object' && obj !== null && key in obj
}

function isError(error: unknown): error is Error {
  return objectHasKey(error, 'message') && typeof error.message === 'string'
}

/**
 * Turns the given 'unknown' error into an Error.
 * @param maybeError the error to turn into an Error
 * @returns the Error
 * @example
 * try {}
 * catch (error) {
 *   const Error = toError(error)
 *   console.log(Error.message)
 * }
 */
function toError(maybeError: unknown): Error {
  return isError(maybeError) ? maybeError : new Error(String(maybeError))
}

export {
  toError,
  EnvironmentError,
  errorMessagesFor,
  InputError,
  ResultError,
  schemaError,
  makeErrorResult,
}
