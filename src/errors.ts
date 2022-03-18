import * as z from 'zod'

type ErrorResult = {
  success: false
  errors: z.ZodIssue[]
  inputErrors: z.ZodIssue[]
}

const formatErrors = (errorResult: ErrorResult) => ({
  error: errorResult.errors.map((issue) => issue.message).join(', '),
  inputErrors: errorResult.inputErrors,
})

export { formatErrors }
export type { ErrorResult }
