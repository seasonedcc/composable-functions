import type * as z from 'zod'

type ErrorWithMessage = {
  message: string
}

type SuccessResult<T = void> = {
  success: true
  data: T
  errors: []
  inputErrors: []
  environmentErrors: []
}
type ErrorResult = {
  success: false
  errors: ErrorWithMessage[]
  inputErrors: z.ZodIssue[]
  environmentErrors: z.ZodIssue[]
}
type ErrorData = Omit<ErrorResult, 'success'>

type Result<T = void> = SuccessResult<T> | ErrorResult

type DomainFunction<Output = unknown> = {
  (input: unknown, environment?: unknown): Promise<Result<Output>>
}

type UnpackResult<F extends DomainFunction> = Awaited<ReturnType<F>>
type UnpackSuccess<F extends DomainFunction> = Extract<
  UnpackResult<F>,
  { success: true }
>
type UnpackData<F extends DomainFunction> = UnpackSuccess<F>['data']

export type {
  DomainFunction,
  Result,
  SuccessResult,
  ErrorResult,
  ErrorData,
  UnpackResult,
  UnpackSuccess,
  UnpackData,
  ErrorWithMessage,
}
