/**
 * A custom error class for input errors.
 *
 * @example
 * const aComposable = withSchema()(() => {
 *   throw new InputError('Invalid input', 'user.name')
 * })
 */
class InputError extends Error {
  /**
   * Path of input attribute that originated the error.
   */
  path: string[]

  constructor(message: string, path: string[] = []) {
    super(message)
    this.name = 'InputError'
    this.path = path
  }
}

/**
 * A custom error class for environment errors.
 *
 * @example
 * const aComposable = withSchema()(() => {
 *  throw new EnvironmentError('Invalid environment', 'user.name')
 * })
 */
class EnvironmentError extends Error {
  /**
   * Path of environment attribute that originated the error.
   */
  path: string[]

  constructor(message: string, path: string[] = []) {
    super(message)
    this.name = 'EnvironmentError'
    this.path = path
  }
}

/**
 * A list of errors
 *
 * Useful to propagate error from mutiple composables in parallel execution
 */
class ErrorList extends Error {
  /**
   * The list of errors
   */
  list: Error[]

  constructor(errors: Error[]) {
    super('ErrorList')
    this.name = 'ErrorList'
    this.list = errors
  }
}

const isInputError = (e: Error): e is InputError => e instanceof InputError
const isEnvironmentError = (e: Error): e is EnvironmentError =>
  e instanceof EnvironmentError
const isGeneralError = (e: Error) => !isInputError(e) && !isEnvironmentError(e)

export {
  EnvironmentError,
  ErrorList,
  InputError,
  isGeneralError,
  isInputError,
  isEnvironmentError,
}
