import {
  EnvironmentError,
  InputError,
  InputErrors,
  ResultError,
} from './errors.ts'
import { schemaError, toErrorWithMessage } from './errors.ts'
import { formatSchemaErrors } from './utils.ts'
import type { DomainFunction, ParserSchema, Result } from './types.ts'

/**
 * A functions that turns the result of its callback into a Result object.
 * @example
 * const result = await safeResult(() => ({
 *   message: 'hello',
 * }))
 * // the type of result is Result<{ message: string }>
 * if (result.success) {
 *   console.log(result.data.message)
 * }
 *
 * const result = await safeResult(() => {
 *  throw new Error('something went wrong')
 * })
 * // the type of result is Result<never>
 * if (!result.success) {
 *  console.log(result.errors[0].message)
 * }
 */
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
function makeDomainFunction<I, E>(
  inputSchema?: ParserSchema<I>,
  environmentSchema?: ParserSchema<E>,
) {
  return function <Output>(handler: (input: I, environment: E) => Output) {
    return function (input, environment = {}) {
      return safeResult(async () => {
        const envResult = await (
          environmentSchema ?? objectSchema
        ).safeParseAsync(environment)
        const result = await (inputSchema ?? undefinedSchema).safeParseAsync(
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
        return handler(result.data as I, envResult.data as E)
      })
    } as DomainFunction<Awaited<Output>>
  }
}

// deno-lint-ignore ban-types
const objectSchema: ParserSchema<{}> = {
  // deno-lint-ignore require-await
  safeParseAsync: async (data: unknown) => {
    if (data == null || typeof data !== 'object') {
      throw new Error('Expected an object')
    }
    return { success: true, data }
  },
}

const undefinedSchema: ParserSchema<undefined> = {
  // deno-lint-ignore require-await
  safeParseAsync: async (data: unknown) => {
    if (data !== undefined) {
      throw new Error('Expected undefined')
    }
    return { success: true, data }
  },
}

export { safeResult, makeDomainFunction, makeDomainFunction as mdf }
