import { failureToErrorResult, ResultError } from './errors.ts'
import * as A from './composable/composable.ts'
import type {
  DomainFunction,
  ErrorData,
  Last,
  MergeObjs,
  Result,
  SuccessResult,
  TupleToUnion,
  UnpackAll,
  UnpackData,
  UnpackDFObject,
  UnpackResult,
} from './types.ts'
import { dfResultFromcomposable } from './constructor.ts'
import { toErrorWithMessage } from './composable/errors.ts'
import { Composable } from './index.ts'

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
  return dfResultFromcomposable(A.composable(fn))() as Promise<Result<T>>
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

/**
 * Creates a single domain function out of multiple domain functions. It will pass the same input and environment to each provided function. The functions will run in parallel. If all constituent functions are successful, The data field will be a tuple containing each function's output.
 * @example
 * import { mdf, all } from 'domain-functions'
 *
 * const a = mdf(z.object({ id: z.number() }))(({ id }) => String(id))
 * const b = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
 * const c = mdf(z.object({ id: z.number() }))(({ id }) => Boolean(id))
 * const df = all(a, b, c)
//       ^? DomainFunction<[string, number, boolean]>
 */
function all<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<UnpackAll<Fns>> {
  return ((input, environment) => {
    const composables = fns.map((df) =>
      A.composable(() => fromSuccess(df)(input, environment)),
    )
    return dfResultFromcomposable(A.all(...(composables as [Composable])))()
  }) as DomainFunction<UnpackAll<Fns>>
}

/**
 * Receives a Record of domain functions, runs them all in parallel and preserves the shape of this record for the data property in successful results.
 * @example
 * import { mdf, collect } from 'domain-functions'
 *
 * const a = mdf(z.object({}))(() => '1')
 * const b = mdf(z.object({}))(() => 2)
 * const df = collect({ a, b })
//       ^? DomainFunction<{ a: string, b: number }>
 */
function collect<Fns extends Record<string, DomainFunction>>(
  fns: Fns,
): DomainFunction<UnpackDFObject<Fns>> {
  const dfsWithKey = Object.entries(fns).map(([key, df]) =>
    map(df, (result) => ({ [key]: result })),
  )
  return map(all(...dfsWithKey), A.mergeObjects) as DomainFunction<
    UnpackDFObject<Fns>
  >
}

/**
 * Creates a composite domain function that will return the result of the first successful constituent domain function. **It is important to notice** that all constituent domain functions will be executed in parallel, so be mindful of the side effects.
 * @example
 * import { mdf, first } from 'domain-functions'
 *
 * const a = mdf(z.object({ n: z.number() }))(({ n }) => n + 1)
const b = mdf(z.object({ n: z.number() }))(({ n }) => String(n))
const df = first(a, b)
//    ^? DomainFunction<string | number>
 */
function first<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<TupleToUnion<UnpackAll<Fns>>> {
  return ((input, environment) => {
    return safeResult(async () => {
      const results = await Promise.all(
        fns.map((fn) => (fn as DomainFunction)(input, environment)),
      )

      const result = results.find((r) => r.success) as SuccessResult | undefined
      if (!result) {
        throw new ResultError({
          errors: results.map(({ errors }) => errors).flat(),
          inputErrors: results.map(({ inputErrors }) => inputErrors).flat(),
          environmentErrors: results
            .map(({ environmentErrors }) => environmentErrors)
            .flat(),
        })
      }

      return result.data
    })
  }) as DomainFunction<TupleToUnion<UnpackAll<Fns>>>
}

/**
 * **NOTE :** Try to use [collect](collect) instead wherever possible since it is much safer. `merge` can create domain functions that will always fail in run-time or even overwrite data from successful constituent functions application. The `collect` function does not have these issues and serves a similar purpose.
 * @example
 * import { mdf, merge } from 'domain-functions'
 *
 * const a = mdf(z.object({}))(() => ({ a: 'a' }))
 * const b = mdf(z.object({}))(() => ({ b: 2 }))
 * const df = merge(a, b)
 * //    ^? DomainFunction<{ a: string, b: number }>
 */
function merge<Fns extends DomainFunction<Record<string, unknown>>[]>(
  ...fns: Fns
): DomainFunction<MergeObjs<UnpackAll<Fns>>> {
  return map(all(...fns), A.mergeObjects)
}

/**
 * Creates a single domain function out of a chain of multiple domain functions. It will pass the same environment to all given functions, and it will pass the output of a function as the next function's input in left-to-right order. The resulting data will be the output of the rightmost function.
 * @example
 * import { mdf, pipe } from 'domain-functions'
 *
 * const a = mdf(z.object({ aNumber: z.number() }))(
 *   ({ aNumber }) => ({ aString: String(aNumber) }),
 * )
 * const b = mdf(z.object({ aString: z.string() }))(
 *   ({ aString }) => ({ aBoolean: aString == '1' }),
 * )
 * const d = pipe(a, b)
 * //    ^? DomainFunction<{ aBoolean: boolean }>
 */
function pipe<T extends DomainFunction[]>(
  ...fns: T
): DomainFunction<Last<UnpackAll<T>>> {
  const last = <T>(ls: T[]): T => ls[ls.length - 1]
  return map(sequence(...fns), last)
}

/**
 * Receives a Record of domain functions, runs them all in sequence like `pipe` but preserves the shape of that record for the data property in successful results.
 * It will pass the same environment to all given functions, and it will pass the output of a function as the next function's input in the given order.
 *
 * **NOTE :** After ECMAScript2015 JS is able to keep the order of keys in an object, we are relying on that. However, number-like keys such as { 1: 'foo' } will be ordered and may break the given order.
 * @example
 * import { mdf, collectSequence } from 'domain-functions'
 *
 * const a = mdf(z.object({}))(() => '1')
const b = mdf(z.number())((n) => n + 2)
const df = collectSequence({ a, b })
//    ^? DomainFunction<{ a: string, b: number }>
 */
function collectSequence<Fns extends Record<string, DomainFunction>>(
  fns: Fns,
): DomainFunction<UnpackDFObject<Fns>> {
  const keys = Object.keys(fns)

  return map(
    map(sequence(...Object.values(fns)), (outputs) =>
      outputs.map((o, i) => ({
        [keys[i]]: o,
      })),
    ),
    A.mergeObjects,
  ) as DomainFunction<UnpackDFObject<Fns>>
}

/**
 * Works like `pipe` but it will collect the output of every function in a tuple.
 * @example
 * import { mdf, sequence } from 'domain-functions'
 *
 * const a = mdf(z.number())((aNumber) => String(aNumber))
 * const b = mdf(z.string())((aString) => aString === '1')
 * const df = sequence(a, b)
 * //    ^? DomainFunction<[string, boolean]>
 */
function sequence<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<UnpackAll<Fns>> {
  return function (input: unknown, environment?: unknown) {
    const dfsAsComposable = fns.map((df) =>
      A.composable(fromSuccess(applyEnvironment(df, environment))),
    )
    return dfResultFromcomposable(
      A.sequence(...(dfsAsComposable as [Composable])),
    )(input)
  } as DomainFunction<UnpackAll<Fns>>
}

/**
 * It takes a domain function and a predicate to apply a transformation over the result.data of that function. It only runs if the function was successfull. When the given domain function fails, its error is returned wihout changes.
 * @example
 * import { mdf, map } from 'domain-functions'
 *
 * const a = mdf(z.object({ n: z.number() }))(({ n }) => n + 1)
 * const df = map(a, (n) => String(n))
 * //    ^? DomainFunction<string>
 */
function map<O, R>(
  dfn: DomainFunction<O>,
  mapper: (element: O) => R | Promise<R>,
): DomainFunction<R> {
  return dfResultFromcomposable(
    A.map(A.composable(fromSuccess(dfn)), mapper),
  ) as DomainFunction<R>
}

/**
 * Use it to add conditional logic to your domain functions' compositions.
 * It receives a domain function and a predicate function that should return the next domain function to be executed based on the previous domain function's output, like `pipe`. If the predicate returns `null` the result of the previous domain function will be returned and it won't be piped.
 * @example
 * import { mdf, branch } from 'domain-functions'
 *
 * const getIdOrEmail = mdf(z.object({ id: z.number().optional(), email: z.string().optional() }))((data) => data.id ?? data.email)
 * const findUserById = mdf(z.number())((id) => db.users.find({ id }))
 * const findUserByEmail = mdf(z.string().email())((email) => db.users.find({ email }))
 * const findUserByIdOrEmail = branch(
 *   getIdOrEmail,
 *   (output) => (typeof output === "number" ? findUserById : findUserByEmail)
 * )
 * //    ^? DomainFunction<User>
 *
 * const getStock = mdf(z.any(), z.object({ id: z.number() }))(_, ({ id }) => db.stocks.find({ id }))
 * const getExtraStock = mdf(z.any(), z.object({ id: z.number() }))(_, ({ id }) => db.stockes.find({ id, extra: true }))
 *
 * const getStockOrExtraStock = branch(
 *  getStock,
 *  ({ items }) => (items.length >= 0 ? null : getExtraStock)
 * )
 * //   ^? DomainFunction<{ items: Item[] }>
 */
function branch<T, R extends DomainFunction | null>(
  dfn: DomainFunction<T>,
  resolver: (o: T) => Promise<R> | R,
) {
  return (async (input, environment) => {
    const result = await dfn(input, environment)
    if (!result.success) return result

    return safeResult(async () => {
      const nextDf = await resolver(result.data)
      if (typeof nextDf !== 'function') return result.data
      return fromSuccess(nextDf)(result.data, environment)
    })
  }) as DomainFunction<
    R extends DomainFunction<infer U> ? U : UnpackData<NonNullable<R>> | T
  >
}

/**
 * It can be used to call a domain function from another domain function. It will return the output of the given domain function if it was successfull, otherwise it will throw a `ResultError` that will bubble up to the parent function.
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
function fromSuccess<T extends DomainFunction>(
  df: T,
): (...args: Parameters<DomainFunction>) => Promise<UnpackData<T>> {
  return async function (...args) {
    const result = await df(...args)
    if (!result.success) throw new ResultError(result)

    return result.data
  }
}

/**
 * Creates a single domain function that will apply a transformation over the ErrorResult of a failed DomainFunction. When the given domain function succeeds, its result is returned without changes.
 * @example
 * import { mdf, mapError } from 'domain-functions'
 *
 * const increment = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
 * const summarizeErrors = (result: ErrorData) =>
 *   ({
 *     errors: [{ message: 'Errors count: ' + result.errors.length }],
 *     inputErrors: [{ message: 'Input errors count: ' + result.inputErrors.length }],
 *     environmentErrors: [{ message: 'Environment errors count: ' + result.environmentErrors.length }],
 *   } as ErrorData)
 *
 * const incrementWithErrorSummary = mapError(increment, summarizeErrors)
 */
function mapError<O>(
  dfn: DomainFunction<O>,
  mapper: (element: ErrorData) => ErrorData | Promise<ErrorData>,
): DomainFunction<O> {
  return (async (input, environment) => {
    const result = await dfn(input, environment)
    if (result.success) return result

    return safeResult(async () => {
      throw new ResultError({ ...(await mapper(result)) })
    })
  }) as DomainFunction<O>
}

type TraceData<T> = {
  input: unknown
  environment: unknown
  result: T
}
/**
 * Whenever you need to intercept inputs and a domain function result without changing them you can use this function.
 * The most common use case is to log failures to the console or to an external service.
 * @param traceFn A function that receives the input, environment and result of a domain function.
 * @example
 * import { mdf, trace } from 'domain-functions'
 *
 * const trackErrors = trace(({ input, output, result }) => {
 *   if(!result.success) sendToExternalService({ input, output, result })
 * })
 * const increment = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
 * const incrementAndTrackErrors = trackErrors(increment)
 * //    ^? DomainFunction<number>
 */
function trace<D extends DomainFunction = DomainFunction<unknown>>(
  traceFn: ({
    input,
    environment,
    result,
  }: TraceData<UnpackResult<D>>) => Promise<void> | void,
): <T>(fn: DomainFunction<T>) => DomainFunction<T> {
  return (fn) => async (input, environment) => {
    const result = await fn(input, environment)
    try {
      await traceFn({ input, environment, result } as TraceData<
        UnpackResult<D>
      >)
      return result
    } catch (e) {
      return failureToErrorResult(A.error([toErrorWithMessage(e)]))
    }
  }
}

export {
  all,
  applyEnvironment,
  branch,
  collect,
  collectSequence,
  first,
  fromSuccess,
  map,
  mapError,
  merge,
  pipe,
  safeResult,
  sequence,
  trace,
}
