import type { ErrorResult } from './types'

const formatErrors = (errorResult: ErrorResult) => ({
  error: errorResult.errors.map((issue) => issue.message).join(', '),
  inputErrors: errorResult.inputErrors,
})

export { formatErrors }
export type { ErrorResult }
