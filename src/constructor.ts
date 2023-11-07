import {
  EnvironmentError,
  failureToErrorResult,
  InputError,
  InputErrors,
  ResultError,
} from './errors.ts'
import { schemaError, toErrorWithMessage } from './errors.ts'
import type {
  DomainFunction,
  ParserIssue,
  ParserSchema,
  Result,
  SchemaError,
} from './types.ts'
import { atmp, Attempt } from './atmp/index.ts'

function formatSchemaErrors(errors: ParserIssue[]): SchemaError[] {
  return errors.map((error) => {
    const { path, message } = error
    return { path: path.map(String), message }
  })
}

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
function safeResult<T>(fn: () => T): Promise<Result<T>> {
  return dfResultFromAtmp(atmp(fn))() as Promise<Result<T>>
}

function dfResultFromAtmp<T extends Attempt, R>(fn: T) {
  return (async (...args) => {
    const r = await fn(...args)

    return r.success
      ? { ...r, inputErrors: [], environmentErrors: [] }
      : failureToErrorResult(r)
  }) as Attempt<(...args: Parameters<T>) => R>
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
    return async function (input, environment = {}) {
      const envResult = await (
        environmentSchema ?? objectSchema
      ).safeParseAsync(environment)
      const result = await (inputSchema ?? undefinedSchema).safeParseAsync(
        input,
      )

      if (!result.success || !envResult.success) {
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
      }
      return dfResultFromAtmp(atmp(handler))(
        result.data as I,
        envResult.data as E,
      )
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

export {
  dfResultFromAtmp,
  makeDomainFunction,
  makeDomainFunction as mdf,
  safeResult,
}

