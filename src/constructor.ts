import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import {
  EnvironmentError,
  InputError,
  InputErrors,
  ResultError,
} from './errors.ts'
import { schemaError, toErrorWithMessage } from './errors.ts'
import { formatSchemaErrors } from './utils.ts'
import type { DomainFunction } from './types.ts'

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
    return async function (input, environment = {}) {
      const envResult = await (
        environmentSchema ?? z.object({})
      ).safeParseAsync(environment)
      const result = await (inputSchema ?? z.undefined()).safeParseAsync(input)

      try {
        if (result.success === true && envResult.success === true) {
          return {
            success: true,
            data: await handler(result.data, envResult.data),
            errors: [],
            inputErrors: [],
            environmentErrors: [],
          }
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
            inputErrors: error.errors.map((e) =>
              schemaError(e.message, e.path),
            ),
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
      return {
        success: false,
        errors: [],
        inputErrors: result.success
          ? []
          : formatSchemaErrors(result.error.issues),
        environmentErrors: envResult.success
          ? []
          : formatSchemaErrors(envResult.error.issues),
      }
    } as DomainFunction<Awaited<Output>>
  }
}

export { makeDomainFunction }
