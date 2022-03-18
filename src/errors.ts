import * as z from 'zod'

type ErrorResult = {
  success: false
  errors: z.ZodIssue[]
  inputErrors: z.ZodIssue[]
}

const formatErrors = (
  errorResult: Omit<ErrorResult, 'errors'> & {
    errors: z.ZodIssue[] | { message: string }[]
  },
) => ({
  error: errorResult.errors.map((issue) => issue.message).join(', '),
  inputErrors: errorResult.inputErrors,
})

export { formatErrors }
export type { ErrorResult }
