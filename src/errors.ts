import type { Failure } from './types.ts'

function failure(errors: Error[]): Failure {
  return { success: false, errors }
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
  result: Failure

  constructor(result: Pick<Failure, 'errors'>) {
    super('ResultError')
    this.name = 'ResultError'
    this.result = failure(result.errors)
  }
}

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
  EnvironmentError,
  failure as makeErrorResult,
  failure,
  InputError,
  ResultError,
  toError,
}
