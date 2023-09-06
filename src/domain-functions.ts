import { ResultError } from './errors.ts'
import { isListOfSuccess, mergeObjects } from './utils.ts'
import type {
  DomainFunction,
  ErrorData,
  MergeObjs,
  Result,
  TupleToUnion,
  UnpackAll,
  UnpackData,
  UnpackDFObject,
  UnpackResult,
} from './types.ts'
import type { Last } from './types.ts'
import type { SuccessResult } from './types.ts'
import { safeResult } from './constructor.ts'

/**
 * Creates a single domain function out of multiple domain functions. It will pass the same input and environment to each provided function. The functions will run in parallel. If all constituent functions are successful, The data field will be a tuple containing each function's output.
 * @example
 * import { makeDomainFunction as mdf, all } from 'domain-functions'
 *
 * const a = mdf(z.object({ id: z.number() }))(({ id }) => String(id))
const b = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
const c = mdf(z.object({ id: z.number() }))(({ id }) => Boolean(id))
const df = all(a, b, c)
//    ^? DomainFunction<[string, number, boolean]>
 */
function all<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<UnpackAll<Fns>> {
  return ((input, environment) => {
    return safeResult(async () => {
      const results = await Promise.all(
        fns.map((fn) => (fn as DomainFunction)(input, environment)),
      )

      if (!isListOfSuccess(results)) {
        throw new ResultError({
          errors: results.map(({ errors }) => errors).flat(),
          inputErrors: results.map(({ inputErrors }) => inputErrors).flat(),
          environmentErrors: results
            .map(({ environmentErrors }) => environmentErrors)
            .flat(),
        })
      }

      return results.map(({ data }) => data)
    })
  }) as DomainFunction<UnpackAll<Fns>>
}

/**
 * Receives a Record of domain functions, runs them all in parallel and preserves the shape of this record for the data property in successful results.
 * @example
 * import { makeDomainFunction as mdf, collect } from 'domain-functions'
 *
 * const a = mdf(z.object({}))(() => '1')
const b = mdf(z.object({}))(() => 2)
const df = collect({ a, b })
//    ^? DomainFunction<{ a: string, b: number }>
 */
function collect<Fns extends Record<string, DomainFunction>>(
  fns: Fns,
): DomainFunction<UnpackDFObject<Fns>> {
  const dfsWithKey = Object.entries(fns).map(([key, df]) =>
    map(df, (result) => ({ [key]: result })),
  )
  return map(all(...dfsWithKey), mergeObjects) as DomainFunction<
    UnpackDFObject<Fns>
  >
}

/**
 * Creates a composite domain function that will return the result of the first successful constituent domain function. **It is important to notice** that all constituent domain functions will be executed in parallel, so be mindful of the side effects.
 * @example
 * import { makeDomainFunction as mdf, first } from 'domain-functions'
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
 * import { makeDomainFunction as mdf, merge } from 'domain-functions'
 *
 * const a = mdf(z.object({}))(() => ({ a: 'a' }))
 * const b = mdf(z.object({}))(() => ({ b: 2 }))
 * const df = merge(a, b)
 * //    ^? DomainFunction<{ a: string, b: number }>
 */
function merge<Fns extends DomainFunction<Record<string, unknown>>[]>(
  ...fns: Fns
): DomainFunction<MergeObjs<UnpackAll<Fns>>> {
  return map(all(...fns), mergeObjects)
}

/**
 * Creates a single domain function out of a chain of multiple domain functions. It will pass the same environment to all given functions, and it will pass the output of a function as the next function's input in left-to-right order. The resulting data will be the output of the rightmost function.
 * @example
 * import { makeDomainFunction as mdf, pipe } from 'domain-functions'
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
 * import { makeDomainFunction as mdf, collectSequence } from 'domain-functions'
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
    mergeObjects,
  ) as DomainFunction<UnpackDFObject<Fns>>
}

/**
 * Works like `pipe` but it will collect the output of every function in a tuple, similar to `all`.
 * @example
 * import { makeDomainFunction as mdf, sequence } from 'domain-functions'
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
    return safeResult(async () => {
      const results = []
      let currResult: undefined | Result<unknown>
      for await (const fn of fns) {
        const result = await fn(
          currResult?.success ? currResult.data : input,
          environment,
        )
        if (!result.success) throw new ResultError(result)
        currResult = result
        results.push(result.data)
      }

      return results
    })
  } as DomainFunction<UnpackAll<Fns>>
}

/**
 * It takes a domain function and a predicate to apply a transformation over the result.data of that function. It only runs if the function was successfull. When the given domain function fails, its error is returned wihout changes.
 * @example
 * import { makeDomainFunction as mdf, map } from 'domain-functions'
 *
 * const a = mdf(z.object({ n: z.number() }))(({ n }) => n + 1)
 * const df = map(a, (n) => String(n))
 * //    ^? DomainFunction<string>
 */
function map<O, R>(
  dfn: DomainFunction<O>,
  mapper: (element: O) => R,
): DomainFunction<R> {
  return async (input, environment) => {
    const result = await dfn(input, environment)
    if (!result.success) return result

    return safeResult(() => mapper(result.data))
  }
}

/**
 * Use it to add conditional logic to your domain functions' compositions.
 * It receives a domain function and a predicate function that should return the next domain function to be executed based on the previous domain function's output.
 * @example
 * import { makeDomainFunction as mdf, branch } from 'domain-functions'
 *
 * const getIdOrEmail = mdf(z.object({ id: z.number().optional(), email: z.string().optional() }))((data) => data.id ?? data.email)
 * const findUserById = mdf(z.number())((id) => db.users.find({ id }))
 * const findUserByEmail = mdf(z.string().email())((email) => db.users.find({ email }))
 * const findUserByIdOrEmail = branch(
 *   getIdOrEmail,
 *   (output) => (typeof output === "number" ? findUserById : findUserByEmail)
 * )
 * //    ^? DomainFunction<User>
 */
function branch<T, Df extends DomainFunction>(
  dfn: DomainFunction<T>,
  resolver: (o: T) => Promise<Df> | Df,
): DomainFunction<UnpackData<Df>> {
  return async (input, environment) => {
    const result = await dfn(input, environment)
    if (!result.success) return result

    return safeResult(async () => {
      const nextDf = await resolver(result.data)
      return fromSuccess(nextDf)(result.data, environment)
    })
  }
}

/**
 * It can be used to call a domain function from another domain function. It will return the output of the given domain function if it was successfull, otherwise it will throw a `ResultError` that will bubble up to the parent function.
 * Also good to use it in successfull test cases.
 * @example
 * import { makeDomainFunction as mdf, fromSuccess } from 'domain-functions'
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
 * import { makeDomainFunction as mdf, mapError } from 'domain-functions'
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
  mapper: (element: ErrorData) => ErrorData,
): DomainFunction<O> {
  return async (input, environment) => {
    const result = await dfn(input, environment)
    if (result.success) return result

    return safeResult(() => {
      throw new ResultError({ ...mapper(result) })
    })
  }
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
 * import { makeDomainFunction as mdf, trace } from 'domain-functions'
 *
 * const trackErrors = trace(({ input, output, result }) => {
 *   if(!result.success) sendToExternalService({ input, output, result })
 * })
 * const increment = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
 * const incrementAndTrackErrors = trackErrors(increment)
 * //    ^? DomainFunction<number>
 */
function trace<D extends DomainFunction = DomainFunction<unknown>>(
  traceFn: ({ input, environment, result }: TraceData<UnpackResult<D>>) => void,
): <T>(fn: DomainFunction<T>) => DomainFunction<T> {
  return (fn) => async (input, environment) => {
    const result = await fn(input, environment)
    traceFn({ input, environment, result } as TraceData<UnpackResult<D>>)
    return result
  }
}

// deno-lint-ignore no-explicit-any
const makeSuccess = (input?: any) =>
  ({
    success: true,
    data: input,
    inputErrors: [],
    errors: [],
    environmentErrors: [],
    // deno-lint-ignore no-explicit-any
  } as any)

const passthrough = <T extends DomainFunction<Record<string, unknown>>>(
  df: T,
) => map(all(df, makeSuccess), mergeObjects)

export {
  all,
  branch,
  collect,
  collectSequence,
  first,
  fromSuccess,
  map,
  mapError,
  merge,
  pipe,
  sequence,
  trace,
  passthrough
}
