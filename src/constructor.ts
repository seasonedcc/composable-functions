import { InputError, EnvironmentError, failure } from './errors.ts'
import type { DomainFunction, ParserSchema, Success } from './types.ts'
import { Composable } from './composable/index.ts'
import { composable } from './composable/index.ts'

function success<const T>(data: T): Success<T> {
  return { success: true, data, errors: [] }
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

// Ainda chamamos de Environment?
// Ainda chamamos de DF? Dado a nova definicao

export {
  fromComposable,
  makeDomainFunction as mdf,
  makeDomainFunction,
  success,
}
