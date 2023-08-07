import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'
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

type NestedErrors<SchemaType> = {
  [Property in keyof SchemaType]: string[] | NestedErrors<SchemaType[Property]>
}

function errorMessagesForSchema<T extends z.ZodTypeAny>(
  errors: SchemaError[],
  _schema: T,
): NestedErrors<z.infer<T>> {
  type SchemaType = z.infer<T>
  type ErrorObject = { path: string[]; messages: string[] }

  const nest = (
    { path, messages }: ErrorObject,
    root: Record<string, unknown>,
  ) => {
    const [head, ...tail] = path
    root[head] =
      tail.length === 0
        ? messages
        : nest(
            { path: tail, messages },
            (root[head] as Record<string, unknown>) ?? {},
          )
    return root
  }

  const compareStringArrays = (a: string[]) => (b: string[]) =>
    JSON.stringify(a) === JSON.stringify(b)

  const toErrorObject = (errors: SchemaError[]): ErrorObject[] =>
    errors.map(({ path, message }) => ({
      path,
      messages: [message],
    }))

  const unifyPaths = (errors: SchemaError[]) =>
    toErrorObject(errors).reduce((memo, error) => {
      const comparePath = compareStringArrays(error.path)
      const mergeErrorMessages = ({ path, messages }: ErrorObject) =>
        comparePath(path)
          ? { path, messages: [...messages, ...error.messages] }
          : { path, messages }
      const existingPath = memo.find(({ path }) => comparePath(path))

      return existingPath ? memo.map(mergeErrorMessages) : [...memo, error]
    }, [] as ErrorObject[])

  const errorTree = unifyPaths(errors).reduce((memo, schemaError) => {
    const errorBranch = nest(schemaError, memo)

    return { ...memo, ...errorBranch }
  }, {}) as NestedErrors<SchemaType>

  return errorTree
}

/**
 * A custom error class for input errors.
 * @example
 * const df = makeDomainFunction()(() => {
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
 * const df = makeDomainFunction()(() => {
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
 * const df = makeDomainFunction()(() => {
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
  errorMessagesForSchema,
  schemaError,
  toErrorWithMessage,
  InputError,
  EnvironmentError,
  InputErrors,
  ResultError,
}
