import { z } from 'https://deno.land/x/zod@v3.19.1/mod.ts'
import type { ErrorWithMessage, SchemaError, ErrorResult } from './types.ts'

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
  [Property in keyof SchemaType]: string[] | NestedErrors<SchemaType[Property]>
}

const errorMessagesForSchema = <T extends z.ZodTypeAny>(
  errors: SchemaError[],
  schema: T,
): NestedErrors<z.infer<typeof schema>> => {
  type SchemaType = z.infer<typeof schema>
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

class ResultError extends Error {
  result: ErrorResult

  constructor(result: ErrorResult) {
    super('ResultError')
    this.name = 'ResultError'
    this.result = result
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
