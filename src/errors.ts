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

function isInputError(e: { name: string; message: string }): boolean {
  return e.name === 'InputError'
}

function isEnvironmentError(e: {
  name: string
  message: string
}): boolean {
  return e.name === 'EnvironmentError'
}

export {
  EnvironmentError,
  ErrorList,
  InputError,
  isEnvironmentError,
  isInputError,
}
