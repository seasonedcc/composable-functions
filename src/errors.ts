import type { ErrorResult, ErrorWithMessage } from './types'

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

const formatErrors = (errorResult: ErrorResult) => ({
  error: errorResult.errors.map((issue) => issue.message).join(', '),
  inputErrors: errorResult.inputErrors,
})

export { formatErrors, toErrorWithMessage }
