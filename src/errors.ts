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

export { EnvironmentError, failure, InputError, ErrorList }
