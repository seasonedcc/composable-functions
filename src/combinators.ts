import type {
  AllArguments,
  CollectArguments,
  Composable,
  First,
  MergeObjs,
  PipeArguments,
  PipeReturn,
  RecordToTuple,
  Result,
  Success,
  UnpackAll,
  UnpackData,
} from './types.ts'
import { composable, failure, success } from './constructors.ts'
import { ErrorList } from './errors.ts'

/**
 * Merges a list of objects into a single object.
 * It is a type-safe version of Object.assign.
 * @param objs the list of objects to merge
 * @returns the merged object
 * @example
 * const obj1 = { a: 1, b: 2 }
 * const obj2 = { c: 3 }
 * const obj3 = { d: 4 }
 * const merged = mergeObjects([obj1, obj2, obj3])
 * //   ^? { a: number, b: number, c: number, d: number }
 */
function mergeObjects<T extends unknown[] = unknown[]>(objs: T) {
  return Object.assign({}, ...objs) as MergeObjs<T>
}

/**
 * Creates a single function out of a chain of multiple Composables. It will pass the output of a function as the next function's input in left-to-right order. The resulting data will be the output of the rightmost function.
 * @example
 * import { cf as C } from 'domain-functions'
 *
 * const a = C.composable(
 *   ({ aNumber }: { aNumber: number }) => ({ aString: String(aNumber) }),
 * )
 * const b = C.composable(
 *   ({ aString }: { aString: string }) => ({ aBoolean: aString == '1' }),
 * )
 * const d = C.pipe(a, b)
 * //    ^? Composable<({ aNumber }: { aNumber: number }) => { aBoolean: boolean }>
 */
function pipe<T extends [Composable, ...Composable[]]>(
  ...fns: T & PipeArguments<T>
) {
  return (async (...args) => {
    //@ts-ignore pipe uses exactly he same generic input type as sequence
    //           I don't understand what is the issue here but ignoring the errors
    //           is safe and much nicer than a bunch of casts to any
    const res = await sequence(...fns)(...args)
    return !res.success ? failure(res.errors) : success(res.data.at(-1))
  }) as PipeReturn<T>
}

/**
 * Creates a single function out of multiple Composables. It will pass the same input to each provided function. The functions will run in parallel. If all constituent functions are successful, The data field will be a tuple containing each function's output.
 * @example
 * import { cf as C } from 'domain-functions'
 *
 * const a = C.composable((id: number) => id + 1)
 * const b = C.composable(String)
 * const c = C.composable(Boolean)
 * const cf = C.all(a, b, c)
//       ^? Composable<(id: number) => [string, number, boolean]>
 */
function all<T extends Composable[]>(...fns: T & AllArguments<T>) {
  return (async (...args) => {
    const results = await Promise.all(fns.map((fn) => fn(...args)))

    if (results.some(({ success }) => success === false)) {
      return failure(results.map(({ errors }) => errors).flat())
    }

    return success((results as Success[]).map(({ data }) => data))
  }) as Composable<
    (...args: Parameters<AllArguments<T>[0]>) => {
      [key in keyof T]: UnpackData<Extract<T[key], Composable>>
    }
  >
}

/**
 * Receives a Record of Composables, runs them all in parallel and preserves the shape of this record for the data property in successful results.
 * @example
 * import { cf as C } from 'domain-functions'
 *
 * const a = C.composable(() => '1')
 * const b = C.composable(() => 2)
 * const df = collect({ a, b })
//       ^? Composable<() => { a: string, b: number }>
 */
function collect<T extends Record<string, Composable>>(
  fns: T & CollectArguments<T>,
) {
  const fnsWithKey = Object.entries(fns).map(([key, cf]) =>
    map(cf, (result) => ({ [key]: result })),
  )
  return map(all(...(fnsWithKey as any)), mergeObjects) as Composable<
    (...args: Parameters<AllArguments<RecordToTuple<T>>[0]>) => {
      [key in keyof T]: UnpackData<Extract<T[key], Composable>>
    }
  >
}

/**
 * Works like `pipe` but it will collect the output of every function in a tuple.
 * @example
 * import { cf as C } from 'domain-functions'
 *
 * const a = C.compose((aNumber: number) => String(aNumber))
 * const b = C.compose((aString: string) => aString === '1')
 * const cf = C.sequence(a, b)
 * //    ^? Composable<(aNumber: number) => [string, boolean]>
 */
function sequence<T extends [Composable, ...Composable[]]>(
  ...fns: T & PipeArguments<T>
) {
  return (async (...args) => {
    const [head, ...tail] = fns as T

    const res = await head(...args)
    if (!res.success) return failure(res.errors)

    const result = [res.data]
    for await (const fn of tail) {
      const res = await fn(result.at(-1))
      if (!res.success) return failure(res.errors)
      result.push(res.data)
    }
    return success(result)
  }) as Composable<
    (...args: Parameters<Extract<First<T>, Composable>>) => UnpackAll<T>
  >
}

/**
 * It takes a Composable and a predicate to apply a transformation over the resulting `data`. It only runs if the function was successfull. When the given function fails, its error is returned wihout changes.
 * @example
 * import { cf as C } from 'domain-functions'
 *
 * const increment = C.composable(({ id }: { id: number }) => id + 1)
 * const incrementToString = C.map(increment, String)
 * //    ^? Composable<string>
 */
function map<T extends Composable, R>(
  fn: T,
  mapper: (res: UnpackData<T>) => R,
) {
  return pipe(fn as Composable, composable(mapper) as Composable) as Composable<
    (...args: Parameters<T>) => R
  >
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
function merge<T extends Composable[]>(
  ...fns: T & AllArguments<T>
): Composable<
  (...args: Parameters<AllArguments<T>[0]>) => MergeObjs<{
    [key in keyof T]: UnpackData<Extract<T[key], Composable>>
  }>
> {
  return map(all(...(fns as never)), mergeObjects as never)
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
function first<T extends Composable[]>(...fns: T & AllArguments<T>) {
  return ((...args) => {
    return composable(async () => {
      const results = await Promise.all(fns.map((fn) => fn(...args)))

      const result = results.find((r) => r.success) as Success | undefined
      if (!result) {
        throw new ErrorList(results.map(({ errors }) => errors).flat())
      }

      return result.data
    })()
  }) as Composable<
    (
      ...args: Parameters<AllArguments<T>[0]>
    ) => UnpackData<Extract<T[number], Composable>>
  >
}

/**
 * Creates a new function that will try to recover from a resulting Failure. When the given function succeeds, its result is returned without changes.
 * @example
 * import { cf as C } from 'domain-functions'
 *
 * const increment = C.composable(({ id }: { id: number }) => id + 1)
 * const negativeOnError = C.catchError(increment, (result, originalInput) => (
 *  originalInput.id * -1
 * ))
 */
function catchError<
  F extends Composable,
  C extends (err: Error[], ...originalInput: Parameters<F>) => any,
>(fn: F, catcher: C) {
  return (async (...args: Parameters<F>) => {
    const res = await fn(...args)
    if (res.success) return success(res.data)
    return composable(catcher)(res.errors as never, ...(args as any as never))
  }) as Composable<
    (
      ...args: Parameters<F>
    ) => Awaited<ReturnType<C>> extends never[]
      ? UnpackData<F> extends any[]
        ? UnpackData<F>
        : Awaited<ReturnType<C>> | UnpackData<F>
      : Awaited<ReturnType<C>> | UnpackData<F>
  >
}

/**
 * Creates a new function that will apply a transformation over a resulting Failure from the given function. When the given function succeeds, its result is returned without changes.
 * @example
 * import { cf as C } from 'domain-functions'
 *
 * const increment = C.composable(({ id }: { id: number }) => id + 1)
 * const incrementWithErrorSummary = C.mapError(increment, (result) => ({
 *   errors: [{ message: 'Errors count: ' + result.errors.length }],
 * }))
 */
function mapError<T extends Composable, R>(
  fn: T,
  mapper: (err: Error[]) => Error[] | Promise<Error[]>,
) {
  return (async (...args) => {
    const res = await fn(...args)
    if (res.success) return success(res.data)
    const mapped = await composable(mapper)(res.errors)
    if (mapped.success) {
      return failure(mapped.data)
    } else {
      return failure(mapped.errors)
    }
  }) as T
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
function trace(
  traceFn: (
    result: Result<unknown>,
    ...originalInput: unknown[]
  ) => Promise<void> | void,
) {
  return <C extends Composable>(fn: C) =>
    (async (...args) => {
      const originalResult = await fn(...args)
      const traceResult = await composable(traceFn)(originalResult, ...args)
      if (traceResult.success) return originalResult

      return failure(traceResult.errors)
    }) as C
}

export {
  all,
  catchError,
  collect,
  first,
  map,
  mapError,
  merge,
  mergeObjects,
  pipe,
  sequence,
  trace,
}
