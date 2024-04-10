import { composable, failure } from '../constructors.ts'
import { EnvironmentError, InputError } from '../errors.ts'
import type { Composable } from '../types.ts'
import type { DomainFunction, ParserSchema } from './types.ts'

/**
 * Creates a domain function.
 * After giving the input and environment schemas, you can pass a handler function that takes type safe input and environment. That function is gonna catch any errors and always return a Result.
 * @param inputSchema the schema for the input
 * @param environmentSchema the schema for the environment
 * @returns a handler function that takes type safe input and environment
 * @example
 * const safeFunction = df.make(
 *  z.object({ greeting: z.string() }),
 *  z.object({ user: z.object({ name: z.string() }) }),
 * )
 * const myDf = safeFunction(({ greeting }, { user }) => {
 *   return { message: `${greeting} ${user.name}` }
 * })
 */
function make<I, E>(
  inputSchema?: ParserSchema<I>,
  environmentSchema?: ParserSchema<E>,
) {
  return function <Output>(handler: (input: I, environment: E) => Output) {
    return fromComposable(
      composable(handler),
      inputSchema,
      environmentSchema,
    ) as DomainFunction<Awaited<Output>>
  }
}

function fromComposable<I, E, A extends Composable>(
  fn: A,
  inputSchema?: ParserSchema<I>,
  environmentSchema?: ParserSchema<E>,
) {
  return async function (input, environment = {}) {
    const envResult = await (environmentSchema ?? objectSchema).safeParseAsync(
      environment,
    )
    const result = await (inputSchema ?? alwaysUndefinedSchema).safeParseAsync(
      input,
    )

    if (!result.success || !envResult.success) {
      const inputErrors = result.success
        ? []
        : result.error.issues.map(
            (error) => new InputError(error.message, error.path as string[]),
          )
      const envErrors = envResult.success
        ? []
        : envResult.error.issues.map(
            (error) =>
              new EnvironmentError(error.message, error.path as string[]),
          )
      return failure([...inputErrors, ...envErrors])
    }
    return fn(result.data, envResult.data)
  } as DomainFunction<Awaited<ReturnType<A>>>
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

const alwaysUndefinedSchema: ParserSchema<undefined> = {
  safeParseAsync: (_data: unknown) => {
    return Promise.resolve({ success: true, data: undefined })
  },
}

/**
 * Takes a function with 2 parameters and partially applies the second one.
 * This is useful when one wants to use a domain function having a fixed environment.
 * @example
 * import { mdf, applyEnvironment } from 'domain-functions'
 *
 * const endOfDay = mdf(z.date(), z.object({ timezone: z.string() }))((date, { timezone }) => ...)
 * const endOfDayUTC = applyEnvironment(endOfDay, { timezone: 'UTC' })
 * //    ^? (input: unknown) => Promise<Result<Date>>
 */
function applyEnvironment<
  Fn extends (input: unknown, environment: unknown) => unknown,
>(df: Fn, environment: unknown) {
  return (input: unknown) => df(input, environment) as ReturnType<Fn>
}

export { applyEnvironment, make, fromComposable }
