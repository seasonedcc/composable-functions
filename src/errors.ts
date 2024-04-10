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
  path: string[]

  constructor(message: string, path: string[] = []) {
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
  path: string[]

  constructor(message: string, path: string[] = []) {
    super(message)
    this.name = 'EnvironmentError'
    this.path = path
  }
}

class ErrorList extends Error {
  list: Error[]

  constructor(errors: Error[]) {
    super('ErrorList')
    this.name = 'ErrorList'
    this.list = failure(errors).errors
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
  EnvironmentError,
  failure as makeErrorResult,
  failure,
  InputError,
  ErrorList,
  toError,
}
