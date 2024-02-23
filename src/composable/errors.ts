import { ErrorWithMessage } from './types.ts'

function objectHasKey<T extends string>(
  obj: unknown,
  key: T,
): obj is { [k in T]: unknown } {
  return typeof obj === 'object' && obj !== null && key in obj
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return objectHasKey(error, 'message') && typeof error.message === 'string'
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
  return isErrorWithMessage(maybeError)
    ? maybeError
    : new Error(String(maybeError))
}

export { toErrorWithMessage }
