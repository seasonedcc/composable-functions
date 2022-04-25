import * as z from 'zod'
import type { ErrorData, ErrorWithMessage, SchemaError } from './types'

function parseError(error: unknown): ErrorData {
  if (isErrorWithErrorData(error)) {
    return {
      errors: error.errors || [],
      inputErrors: error.inputErrors || [],
      environmentErrors: error.environmentErrors || [],
    }
  }

  return {
    errors: [toErrorWithMessage(error)],
    inputErrors: [],
    environmentErrors: [],
  }
}

function isErrorWithErrorData(error: unknown): error is Partial<ErrorData> {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('errors' in error ||
      'inputErrors' in error ||
      'environmentErrors' in error)
  )
}

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

export {
  errorMessagesFor,
  errorMessagesForSchema,
  parseError,
  schemaError,
  toErrorWithMessage,
}
