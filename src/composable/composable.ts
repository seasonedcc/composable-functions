import { toErrorWithMessage } from './errors.ts'
import {
  AllArguments,
  CollectArguments,
  Composable,
  ErrorWithMessage,
  Failure,
  First,
  Fn,
  MergeObjs,
  PipeArguments,
  PipeReturn,
  RecordToTuple,
  Success,
  UnpackAll,
  UnpackResult,
} from './types.ts'

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

function success<T>(data: T): Success<T> {
  return { success: true, data, errors: [] }
}

function error(errors: ErrorWithMessage[]): Failure {
  return { success: false, errors }
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
      return error([toErrorWithMessage(e)])
    }
  }
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
    return !res.success ? error(res.errors) : success(res.data.at(-1))
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
function all<T extends [Composable, ...Composable[]]>(
  ...fns: T & AllArguments<T>
) {
  return (async (...args: any) => {
    const results = await Promise.all(fns.map((fn) => fn(...args)))

    if (results.some(({ success }) => success === false)) {
      return error(results.map(({ errors }) => errors).flat())
    }

    return success((results as Success<any>[]).map(({ data }) => data))
  }) as Composable<
    (...args: Parameters<AllArguments<T>[0]>) => {
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Composable>>>
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
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Composable>>>
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
    if (!res.success) return error(res.errors)

    const result = [res.data]
    for await (const fn of tail) {
      const res = await fn(result.at(-1))
      if (!res.success) return error(res.errors)
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
  mapper: (res: UnpackResult<ReturnType<T>>) => R,
) {
  return pipe(fn as Composable, composable(mapper) as Composable) as Composable<
    (...args: Parameters<T>) => R
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
function catchError<T extends Fn, R>(
  fn: Composable<T>,
  catcher: (
    err: Omit<Failure, 'success'>,
    ...originalInput: Parameters<T>
  ) => R,
) {
  return (async (...args: Parameters<T>) => {
    const res = await fn(...args)
    if (res.success) return success(res.data)
    return composable(catcher)(res, ...(args as any))
  }) as Composable<
    (
      ...args: Parameters<T>
    ) => ReturnType<T> extends any[]
      ? R extends never[]
        ? ReturnType<T>
        : ReturnType<T> | R
      : ReturnType<T> | R
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
  mapper: (err: Omit<Failure, 'success'>) => Omit<Failure, 'success'>,
) {
  return (async (...args) => {
    const res = await fn(...args)
    if (res.success) return success(res.data)
    const mapped = await composable(mapper)(res)
    if (mapped.success) {
      return error(mapped.data.errors)
    } else {
      return error(mapped.errors)
    }
  }) as T
}

export {
  all,
  catchError,
  collect,
  composable,
  error,
  map,
  mapError,
  mergeObjects,
  pipe,
  sequence,
  success,
}
