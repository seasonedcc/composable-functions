import * as z from 'zod'
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
        const errors = [{ message: (error as Error).message }]
        return { success: false, errors, inputErrors: [] }
      }
    }) as DomainFunction<Awaited<ReturnType<typeof handler>>>
    return domainFunction
  }

function isListOfSuccess<T>(result: Result<T>[]): result is SuccessResult<T>[] {
  return result.every(({ success }) => success === true)
}

function all<A, B>(
  a: DomainFunction<A>,
  b: DomainFunction<B>,
): DomainFunction<[A, B]>
function all<A, B, C>(
  a: DomainFunction<A>,
  b: DomainFunction<B>,
  c: DomainFunction<C>,
): DomainFunction<[A, B, C]>
function all<A, B, C, D>(
  a: DomainFunction<A>,
  b: DomainFunction<B>,
  c: DomainFunction<C>,
  d: DomainFunction<D>,
): DomainFunction<[A, B, C, D]>
function all<A, B, C, D, E>(
  a: DomainFunction<A>,
  b: DomainFunction<B>,
  c: DomainFunction<C>,
  d: DomainFunction<D>,
  e: DomainFunction<E>,
): DomainFunction<[A, B, C, D, E]>
function all<A, B, C, D, E, F>(
  a: DomainFunction<A>,
  b: DomainFunction<B>,
  c: DomainFunction<C>,
  d: DomainFunction<D>,
  e: DomainFunction<E>,
  f: DomainFunction<F>,
): DomainFunction<[A, B, C, D, E, F]>
function all(...fns: DomainFunction[]): DomainFunction {
  return async (input: object, environment?: object) => {
    const results = await Promise.all(fns.map((fn) => fn(input, environment)))

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
    }
  }
}

export { makeDomainFunction, all }
