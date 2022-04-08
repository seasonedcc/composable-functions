import * as z from 'zod'
import { toErrorWithMessage } from './errors'
import { DomainFunction, Result, SuccessResult } from './types'

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
        return {
          success: false,
          errors: [],
          inputErrors: result.error.issues,
        }
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
          errors: [],
          inputErrors: [],
        }
      } catch (error) {
        const errors = [toErrorWithMessage(error)]
        return { success: false, errors, inputErrors: [] }
      }
    }) as DomainFunction<Awaited<ReturnType<typeof handler>>>
    return domainFunction
  }

type Unpack<T> = T extends DomainFunction<infer F> ? F : T
function all<T extends readonly unknown[] | []>(
  ...fns: T
): DomainFunction<{ -readonly [P in keyof T]: Unpack<T[P]> }> {
  return async (input: object, environment?: object) => {
    const results = await Promise.all(
      fns.map((fn) => (fn as DomainFunction)(input, environment)),
    )

    if (!isListOfSuccess(results)) {
      return {
        success: false,
        errors: results.map(({ errors }) => errors).flat(),
        inputErrors: results.map(({ inputErrors }) => inputErrors).flat(),
      }
    }

    return {
      success: true,
      data: results.map(({ data }) => data),
      inputErrors: [],
      errors: [],
    } as unknown as SuccessResult<{ -readonly [P in keyof T]: Unpack<T[P]> }>
  }
}

function isListOfSuccess<T>(result: Result<T>[]): result is SuccessResult<T>[] {
  return result.every(({ success }) => success === true)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Last<T extends readonly unknown[]> = T extends [...infer I, infer L]
  ? L
  : never
type Flow = <T extends readonly DomainFunction[]>(...fns: T) => Last<T>

const pipe: Flow = (...fns) => {
  const [head, ...tail] = fns

  return ((input: object, environment?: object) => {
    return tail.reduce(async (memo, fn) => {
      const resolved = await memo
      if (resolved.success) {
        return fn(resolved.data as object, environment)
      } else {
        return memo
      }
    }, head(input, environment))
  }) as Last<typeof fns>
}

export { makeDomainFunction, all, pipe }
