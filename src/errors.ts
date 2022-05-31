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

const errorMessagesForSchema = <T extends z.AnyZodObject>(
  errors: SchemaError[],
  schema: T,
) => {
  type SchemaType = z.infer<T>
  const mappedErrors = {} as Record<keyof SchemaType, string[]>
  for (const stringKey in schema.shape) {
    const key = stringKey as keyof SchemaType
    mappedErrors[key] = errorMessagesFor(errors, stringKey)
  }
  return mappedErrors
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
