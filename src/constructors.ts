import { mapError } from './combinators.ts'
import { EnvironmentError, ErrorList, InputError } from './errors.ts'
import type { Composable, Failure, Fn, ParserSchema, Success } from './types.ts'
import { UnpackData } from './types.ts'

function success<const T>(data: T): Success<T> {
  return { success: true, data, errors: [] }
}

function failure(errors: Error[]): Failure {
  return { success: false, errors }
}

function toError(maybeError: unknown): Error {
  if (maybeError instanceof Error) return maybeError
  try {
    return new Error(JSON.stringify(maybeError))
  } catch (_e) {
    return new Error(String(maybeError))
  }
}

/**
 * Creates a composable function.
 * That function is gonna catch any errors and always return a Result.
 * @param fn a function to be used as a Composable
 */
function composable<T extends Fn>(fn: T): Composable<T> {
  return async (...args) => {
    try {
      // deno-lint-ignore no-explicit-any
      const result = await fn(...(args as any[]))
      return success(result)
    } catch (e) {
      if (e instanceof ErrorList) {
        return failure(e.list)
      }
      return failure([toError(e)])
    }
  }
}

/**
 * It can be used to call a domain function from another domain function. It will return the output of the given domain function if it was successfull, otherwise it will throw a `ErrorList` that will bubble up to the parent function.
 * Also good to use it in successfull test cases.
 * @example
 * import { mdf, fromSuccess } from 'domain-functions'
 *
 * const add1 = mdf(z.number())((n) => n + 1)
 * const result = await add1(1)
 * //    ^? Result<number>
 * const data = await fromSuccess(add1)(n)
 * //    ^? number
 * expect(data).toBe(n + 1)
 */
function fromSuccess<O, T extends Composable<(...a: any[]) => O>>(
  fn: T,
  onError: (errors: Error[]) => Error[] | Promise<Error[]> = (e) => e,
) {
  return (async (...args: any[]) => {
    const result = await mapError(fn, onError)(...args)
    if (result.success) return result.data

    throw new ErrorList(result.errors)
  }) as T extends Composable<(...a: infer P) => infer O>
    ? (...args: P) => Promise<O>
    : never
}

/**
 * Creates a domain function.
 * After giving the input and environment schemas, you can pass a handler function that takes type safe input and environment. That function is gonna catch any errors and always return a Result.
 * @param inputSchema the schema for the input
 * @param environmentSchema the schema for the environment
 * @returns a handler function that takes type safe input and environment
 * @example
 * const safeFunction = withSchema(
 *  z.object({ greeting: z.string() }),
 *  z.object({ user: z.object({ name: z.string() }) }),
 * )
 * const myDf = safeFunction(({ greeting }, { user }) => {
 *   return { message: `${greeting} ${user.name}` }
 * })
 */
function withSchema<I, E>(
  inputSchema?: ParserSchema<I>,
  environmentSchema?: ParserSchema<E>,
) {
  return function <Output>(handler: (input: I, environment: E) => Output) {
    return applySchema(
      composable(handler),
      inputSchema,
      environmentSchema,
    ) as Composable<(input?: unknown, environment?: unknown) => Awaited<Output>>
  }
}

function applySchema<I, E, A extends Composable>(
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
  } as Composable<(input?: unknown, environment?: unknown) => UnpackData<A>>
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

export { composable, failure, fromSuccess, success, withSchema, applySchema }
