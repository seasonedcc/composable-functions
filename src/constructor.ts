import type { Schema as AnySchema, Infer } from 'https://deno.land/x/typeschema@v0.9.3/mod.ts'
import { validate } from 'https://deno.land/x/typeschema@v0.9.3/mod.ts'

import {
  EnvironmentError,
  InputError,
  InputErrors,
  ResultError,
} from './errors.ts'
import { schemaError, toErrorWithMessage } from './errors.ts'
import { assertObject, assertUndefined, formatSchemaErrors } from './utils.ts'
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
  Schema extends AnySchema,
  EnvSchema extends AnySchema,
>(inputSchema?: Schema, environmentSchema?: EnvSchema) {
  return function <Output>(
    handler: (input: Infer<Schema>, environment: Infer<EnvSchema>) => Output,
  ) {
    return function (input, environment = {}) {
      return safeResult(async () => {
        const envResult = await validate(
          environmentSchema ?? assertObject,
          environment,
        )
        const result = await validate(inputSchema ?? assertUndefined, input)

        if ('issues' in result || 'issues' in envResult) {
          throw new ResultError({
            inputErrors:
              'issues' in result ? formatSchemaErrors(result.issues) : [],
            environmentErrors:
              'issues' in envResult ? formatSchemaErrors(envResult.issues) : [],
          })
        }
        return handler(result.data, envResult.data)
      })
    } as DomainFunction<Awaited<Output>>
  }
}

export { safeResult, makeDomainFunction }
