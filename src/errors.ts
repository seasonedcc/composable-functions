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
  path: string[] = [],
) => {
  type SchemaType = z.infer<T>

  const mappedErrors = {} as NestedErrors<SchemaType>
  for (const [stringKey, unknownDef] of Object.entries(schema.shape)) {
    const key = stringKey as keyof SchemaType
    const def = unknownDef as SchemaType
    if (def.shape !== undefined) {
      mappedErrors[key] = errorMessagesForSchema(
        errors,
        def as z.AnyZodObject,
        [...path, key as string],
      ) as NestedErrors<SchemaType>
    } else {
      mappedErrors[key] = errorMessagesFor(
        errors,
        [...path, stringKey].join('.'),
      )
    }
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
