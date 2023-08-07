import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import {
  EnvironmentError,
  InputError,
  InputErrors,
  ResultError,
} from './errors.ts'
import { schemaError, toErrorWithMessage } from './errors.ts'
import { formatSchemaErrors } from './utils.ts'
import type { DomainFunction, Result } from './types.ts'

async function safeResult<T>(fn: () => T): Promise<Result<T>> {
  try {
    return {
      success: true,
      data: await fn(),
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    }
  } catch (error) {
    if (error instanceof InputError) {
      return {
        success: false,
        errors: [],
        environmentErrors: [],
        inputErrors: [schemaError(error.message, error.path)],
      }
    }
    if (error instanceof EnvironmentError) {
      return {
        success: false,
        errors: [],
        environmentErrors: [schemaError(error.message, error.path)],
        inputErrors: [],
      }
    }
    if (error instanceof InputErrors) {
      return {
        success: false,
        errors: [],
        environmentErrors: [],
        inputErrors: error.errors.map((e) => schemaError(e.message, e.path)),
      }
    }
    if (error instanceof ResultError) return error.result

    return {
      success: false,
      errors: [toErrorWithMessage(error)],
      inputErrors: [],
      environmentErrors: [],
    }
  }
}

/**
 * Creates a domain function.
 * After giving the input and environment schemas, you can pass a handler function that takes type safe input and environment. That function is gonna catch any errors and always return a Result.
 * @param inputSchema the schema for the input
 * @param environmentSchema the schema for the environment
 * @returns a handler function that takes type safe input and environment
 * @example
 * const safeFunction = makeDomainFunction(
 *  z.object({ greeting: z.string() }),
 *  z.object({ user: z.object({ name: z.string() }) }),
 * )
 * const myDf = safeFunction(({ greeting }, { user }) => {
 *   return { message: `${greeting} ${user.name}` }
 * })
 */
function makeDomainFunction<
  Schema extends z.ZodTypeAny,
  EnvSchema extends z.ZodTypeAny,
>(inputSchema?: Schema, environmentSchema?: EnvSchema) {
  return function <Output>(
    handler: (
      input: z.infer<Schema>,
      environment: z.infer<EnvSchema>,
    ) => Output,
  ) {
    return function (input, environment = {}) {
      return safeResult(async () => {
        const envResult = await (
          environmentSchema ?? z.object({})
        ).safeParseAsync(environment)
        const result = await (inputSchema ?? z.undefined()).safeParseAsync(
          input,
        )

        if (!result.success || !envResult.success) {
          throw new ResultError({
            inputErrors: result.success
              ? []
              : formatSchemaErrors(result.error.issues),
            environmentErrors: envResult.success
              ? []
              : formatSchemaErrors(envResult.error.issues),
          })
        }
        return handler(result.data, envResult.data)
      })
    } as DomainFunction<Awaited<Output>>
  }
}

export { safeResult, makeDomainFunction }
