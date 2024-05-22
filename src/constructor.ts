import {
  EnvironmentError,
  InputError,
  InputErrors,
  ResultError,
} from './errors.ts'
import { schemaError, toErrorWithMessage } from './errors.ts'
import { formatSchemaErrors } from './utils.ts'
import type {
  DomainFunction,
  ErrorResult,
  ParserSchema,
  Result,
} from './types.ts'
import { composable } from './future/index.ts'

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
  const result = await composable(fn)()
  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    }
  } else {
    return result.errors.reduce(
      (previous, current) => {
        if (current instanceof ResultError)
          return { ...previous, ...current.result }
        else if (current instanceof InputError) {
          previous.inputErrors.push(schemaError(current.message, current.path))
        } else if (current instanceof EnvironmentError) {
          previous.environmentErrors.push(
            schemaError(current.message, current.path),
          )
        } else if (current instanceof InputErrors) {
          previous.inputErrors = [
            ...previous.inputErrors,
            ...current.errors.map((e) => schemaError(e.message, e.path)),
          ]
        } else {
          previous.errors.push({
            message: current.message,
            exception: current,
          })
        }

        return previous
      },
      {
        success: false,
        errors: [],
        environmentErrors: [],
        inputErrors: [],
      } as ErrorResult,
    )
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

const objectSchema: ParserSchema<Record<PropertyKey, unknown>> = {
  safeParseAsync: (data: unknown) => {
    if (Object.prototype.toString.call(data) !== '[object Object]') {
      return Promise.resolve({
        success: false,
        error: { issues: [{ path: [], message: 'Expected an object' }] },
      })
    }
    const someRecord = data as Record<PropertyKey, unknown>
    return Promise.resolve({ success: true, data: someRecord })
  },
}

const undefinedSchema: ParserSchema<undefined> = {
  safeParseAsync: (data: unknown) => {
    if (data !== undefined) {
      return Promise.resolve({
        success: false,
        error: { issues: [{ path: [], message: 'Expected undefined' }] },
      })
    }
    return Promise.resolve({ success: true, data })
  },
}

export { makeDomainFunction, makeDomainFunction as mdf, safeResult }
