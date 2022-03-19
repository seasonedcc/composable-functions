import * as z from 'zod'
import type { ErrorResult } from './errors'

type SuccessResult<T = void> = { success: true; data: T }

type Result<T = void> = SuccessResult<T> | ErrorResult

type DomainFunction<Output> = {
  (input: object, environment?: object): Promise<Result<Output>>
}

type MakeDomainFunction = <
  Schema extends z.ZodTypeAny,
  EnvSchema extends z.ZodTypeAny,
>(
  inputSchema: Schema,
  environmentSchema?: EnvSchema,
) => <Output>(
  handler: (
    inputSchema: z.infer<Schema>,
    environmentSchema: z.infer<EnvSchema>,
  ) => Promise<Output>,
) => DomainFunction<Output>

const makeDomainFunction: MakeDomainFunction =
  (
    inputSchema: z.ZodTypeAny = z.object({}),
    environmentSchema: z.ZodTypeAny = z.object({}),
  ) =>
  (handler) => {
    const domainFunction = (async (input, environment = {}) => {
      const envResult = environmentSchema.safeParse(environment)
      const result = inputSchema.safeParse(input)

      if (result.success === false) {
        return { success: false, errors: [], inputErrors: result.error.issues }
      } else if (envResult.success === false) {
        return {
          success: false,
          errors: envResult.error.issues,
          inputErrors: [],
        }
      }
      try {
        return {
          success: true,
          data: await handler(result.data, envResult.data),
        }
      } catch (error) {
        const errors = [{ message: (error as Error).message }]
        return { success: false, errors, inputErrors: [] }
      }
    }) as DomainFunction<Awaited<ReturnType<typeof handler>>>
    return domainFunction
  }

type UnpackData<F extends DomainFunction<unknown>> = Extract<
  Awaited<ReturnType<F>>,
  { success: true }
>['data']
type UnpackSuccess<F extends DomainFunction<unknown>> = Extract<
  Awaited<ReturnType<F>>,
  { success: true }
>
type UnpackError<F extends DomainFunction<unknown>> = Extract<
  Awaited<ReturnType<F>>,
  { success: false }
>

export { makeDomainFunction }
export type {
  DomainFunction,
  Result,
  SuccessResult,
  UnpackData,
  UnpackSuccess,
  UnpackError,
}
