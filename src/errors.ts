import * as z from 'zod'
import type { ErrorWithMessage, SchemaError } from './types'

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return { message: maybeError.message }
  return { message: String(maybeError) }
}

function schemaError(message: string, path: string): SchemaError {
  return { message, path: path.split('.') }
}

const errorMessagesFor = (errors: SchemaError[], name: string) =>
  errors
    .filter(({ path }) => path.join('.') === name)
    .map(({ message }) => message)

type NestedErrors<SchemaType> = {
  [Property in keyof SchemaType]: string[] | NestedErrors<SchemaType>
}

const errorMessagesForSchema = <T extends z.AnyZodObject>(
  errors: SchemaError[],
  schema: T,
): NestedErrors<z.infer<typeof schema>> => {
  type SchemaType = z.infer<typeof schema>

  const nest = (
    { path, messages }: { path: string[]; messages: string[] },
    root: Record<string, unknown>,
  ) => {
    if (path.length === 1) {
      root[path[0]] = [...messages]
      return root
    } else {
      root[path[0]] = nest(
        { path: path.slice(1), messages },
        (root[path[0]] as Record<string, unknown>) || {},
      )
      return root
    }
  }

  const unifyPaths = (errors: SchemaError[]) => {
    const coercedErrors: { path: string[]; messages: string[] }[] = errors.map(
      ({ path, message }) => ({
        path,
        messages: [message],
      }),
    )
    const unifiedErrors = [] as typeof coercedErrors
    return coercedErrors.reduce((memo, error) => {
      const existingPath = memo.find(
        ({ path }) => JSON.stringify(path) === JSON.stringify(error.path),
      )
      if (existingPath) {
        return memo.map(({ path, messages }) =>
          JSON.stringify(path) === JSON.stringify(error.path)
            ? { path, messages: [...messages, ...error.messages] }
            : { path, messages },
        )
      } else {
        return [...memo, error]
      }
    }, unifiedErrors)
  }

  const unifiedErrors = unifyPaths(errors)
  return unifiedErrors.reduce(
    (memo, schemaError) => ({ ...memo, ...nest(schemaError, memo) }),
    {},
  ) as NestedErrors<SchemaType>
}

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

class EnvironmentError extends Error {
  path: string

  constructor(message: string, path: string) {
    super(message)
    this.name = 'EnvironmentError'
    this.path = path
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
}
