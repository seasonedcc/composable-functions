import * as z from 'zod'
import { DomainFunction } from './types'

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

function compose<A, B>(
  a: DomainFunction<A>,
  b: DomainFunction<B>,
): DomainFunction<[A, B]> {
  return async (input: object, environment?: object) => {
    const [resultA, resultB] = await Promise.all([
      a(input, environment),
      b(input, environment),
    ])

    if (!resultA.success || !resultB.success) {
      return {
        success: false,
        errors: [...resultA.errors, ...resultB.errors],
        inputErrors: [...resultA.inputErrors, ...resultB.inputErrors],
      }
    }

    return {
      success: true,
      data: [resultA.data, resultB.data],
      inputErrors: [],
      errors: [],
    }
  }
}

export { makeDomainFunction, compose }
