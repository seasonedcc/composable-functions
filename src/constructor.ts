import {
  EnvironmentError,
  InputError,
  InputErrors,
  ResultError,
} from './errors.ts'
import { schemaError } from './errors.ts'
import type {
  DomainFunction,
  ErrorResult,
  ParserSchema,
  Result,
} from './types.ts'
import * as Future from 'npm:composable-functions@beta'

function toComposable<R>(
  df: DomainFunction<R>,
): Future.Composable<(input?: unknown, environment?: unknown) => R> {
  return (async (input?: unknown, environment?: unknown) => {
    const result = await df(input, environment)

    if (result.success) {
      return {
        success: true,
        data: result.data,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
      }
    } else {
      return {
        success: false,
        errors: [
          ...result.errors.map((e) => e.exception ?? new Error(e.message)),
          ...result.inputErrors.map(
            (e) => new Future.InputError(e.message, e.path),
          ),
          ...result.environmentErrors.map(
            (e) => new Future.EnvironmentError(e.message, e.path),
          ),
        ],
      }
    }
  }) as Future.Composable<(input?: unknown, environment?: unknown) => R>
}

function fromComposable<R>(
  cf: Future.Composable<(inout?: unknown, environment?: unknown) => R>,
) {
  return (async (input?: unknown, environment?: unknown) => {
    const result = await cf(input, environment)
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
            previous.inputErrors.push(
              schemaError(current.message, current.path),
            )
          } else if (current instanceof EnvironmentError) {
            previous.environmentErrors.push(
              schemaError(current.message, current.path),
            )
          } else if (current instanceof InputErrors) {
            previous.inputErrors = [
              ...previous.inputErrors,
              ...current.errors.map((e) => schemaError(e.message, e.path)),
            ]
          } else if (current instanceof Future.InputError) {
            previous.inputErrors.push(
              schemaError(current.message, current.path.join('.')),
            )
          } else if (current instanceof Future.EnvironmentError) {
            previous.environmentErrors.push(
              schemaError(current.message, current.path.join('.')),
            )
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
  }) as DomainFunction<R>
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
async function safeResult<T>(fn: () => T): Promise<Result<T>> {
  return await fromComposable(Future.composable(fn))()
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
      const futureEnvSchema = {
        safeParse: () => envResult,
      }
      const inputResult = await (inputSchema ?? undefinedSchema).safeParseAsync(
        input,
      )
      const futureInputSchema = {
        safeParse: () => inputResult,
      }

      return fromComposable(
        Future.withSchema(
          futureInputSchema as any,
          futureEnvSchema as any,
        )(handler as any),
      )(input, environment)
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
  makeDomainFunction,
  makeDomainFunction as mdf,
  safeResult,
  fromComposable,
  toComposable
}
