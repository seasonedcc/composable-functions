/**
 * A custom error class for input errors.
 *
 * @example
 * const fn = () => {
 *   throw new InputError('Invalid input', 'user.name')
 * }
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
 * A custom error class for context errors.
 *
 * @example
 * const fn = () => {
 *  throw new ContextError('Invalid context', 'user.name')
 * }
 */
class ContextError extends Error {
  /**
   * Path of context attribute that originated the error.
   */
  path: string[]

  constructor(message: string, path: string[] = []) {
    super(message)
    this.name = 'ContextError'
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

/**
 * A function to check if an `Error` or a `SerializableError` is an InputError
 */
function isInputError(e: { name: string; message: string }): boolean {
  return e.name === 'InputError'
}

/**
 * A function to check if an `Error` or a `SerializableError` is a ContextError
 */
function isContextError(e: { name: string; message: string }): boolean {
  return e.name === 'ContextError'
}

export { ContextError, ErrorList, InputError, isContextError, isInputError }
