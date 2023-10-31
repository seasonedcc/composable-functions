import { ErrorWithMessage } from './types.ts'
import { objectHasKey } from './utils.ts'

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return objectHasKey(error, 'message') && typeof error.message === 'string'
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  return {
    message: isErrorWithMessage(maybeError)
      ? maybeError.message
      : String(maybeError),
    exception: maybeError,
    cause: objectHasKey(maybeError, 'cause') ? maybeError.cause : undefined,
  }
}

export { isErrorWithMessage, toErrorWithMessage }
