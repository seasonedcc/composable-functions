import {
  errorResultToFailure,
  failureToErrorResult,
  makeErrorResult,
} from './errors.ts'
import type {
  DomainFunction,
  ParserIssue,
  ParserSchema,
  SchemaError,
  SuccessResult,
} from './types.ts'
import { Composable } from './composable/index.ts'
import { composable } from './composable/composable.ts'

function makeSuccessResult<const T>(data: T): SuccessResult<T> {
  return {
    success: true,
    data,
    inputErrors: [],
    errors: [],
    environmentErrors: [],
  }
}

function dfResultFromcomposable<T extends Composable, R>(fn: T) {
  return (async (...args) => {
    const r = await fn(...args)

    return r.success ? makeSuccessResult(r.data) : failureToErrorResult(r)
  }) as Composable<(...args: Parameters<T>) => R>
}

function formatSchemaErrors(errors: ParserIssue[]): SchemaError[] {
  return errors.map((error) => {
    const { path, message } = error
    return { path: path.map(String), message }
  })
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

function toComposable<I = unknown, E = unknown, O = unknown>(
  df: DomainFunction<O>,
) {
  return ((input = undefined, environment = {}) =>
    df(input, environment).then((r) =>
      r.success ? r : errorResultToFailure(r),
    )) as unknown as Composable<(input?: I, environment?: E) => O>
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
    const result = await (inputSchema ?? undefinedSchema).safeParseAsync(input)

    if (!result.success || !envResult.success) {
      return makeErrorResult({
        inputErrors: result.success
          ? []
          : formatSchemaErrors(result.error.issues),
        environmentErrors: envResult.success
          ? []
          : formatSchemaErrors(envResult.error.issues),
      })
    }
    return dfResultFromcomposable(fn)(
      ...([result.data as I, envResult.data as E] as Parameters<A>),
    )
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
  dfResultFromcomposable,
  fromComposable,
  makeDomainFunction,
  makeDomainFunction as mdf,
  toComposable,
  makeSuccessResult,
}
