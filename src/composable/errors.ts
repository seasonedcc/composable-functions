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

export { toError }
