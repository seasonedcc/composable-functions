import { toErrorWithMessage } from './errors.ts'
import {
  Composable,
  ErrorWithMessage,
  Failure,
  First,
  Fn,
  Last,
  MergeObjs,
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

function pipe<T extends [Composable, ...Composable[]]>(...fns: T) {
  return (async (...args) => {
    const res = await sequence(...fns)(...args)
    return !res.success ? error(res.errors) : success(res.data.at(-1))
  }) as Composable<
    (
      ...args: Parameters<Extract<First<T>, Composable>>
    ) => UnpackResult<ReturnType<Extract<Last<T>, Composable>>>
  >
}

function all<T extends [Composable, ...Composable[]]>(...fns: T) {
  return (async (...args: any) => {
    const results = await Promise.all(fns.map((fn) => fn(...args)))

    if (results.some(({ success }) => success === false)) {
      return error(results.map(({ errors }) => errors).flat())
    }

    return success((results as Success<any>[]).map(({ data }) => data))
  }) as unknown as Composable<
    (...args: Parameters<Extract<T[keyof T], Composable>>) => {
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Composable>>>
    }
  >
}

function collect<T extends Record<string, Composable>>(fns: T) {
  const [fn, ...fnsWithKey] = Object.entries(fns).map(([key, df]) =>
    map(df, (result) => ({ [key]: result })),
  )
  return map(all(fn, ...fnsWithKey), mergeObjects) as Composable<
    (...args: Parameters<Extract<T[keyof T], Composable>>) => {
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Composable>>>
    }
  >
}

function sequence<T extends [Composable, ...Composable[]]>(...fns: T) {
  return (async (...args) => {
    const [head, ...tail] = fns

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
 * import { composable as C } from 'domain-functions'
 *
 * const increment = C.composable(({ id }: { id: number }) => id + 1)
 * const incrementToString = C.map(increment, String)
 * //    ^? Composable<string>
 */
function map<T extends Composable, R>(
  fn: T,
  mapper: (res: UnpackResult<ReturnType<T>>) => R,
) {
  return (async (...args) => {
    const res = await fn(...args)
    if (!res.success) return error(res.errors)
    const mapped = await composable(mapper)(res.data)
    if (!mapped.success) return error(mapped.errors)
    return mapped
  }) as Composable<(...args: Parameters<T>) => R>
}

/**
 * Creates a new function that will apply a transformation over a resulting Failure from the given function. When the given function succeeds, its result is returned without changes.
 * @example
 * import { composable as C } from 'domain-functions'
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
    return !res.success ? error(mapper(res).errors) : success(res.data)
  }) as T
}

export {
  all,
  collect,
  composable,
  composable as cf,
  composable as λ,
  error,
  map,
  mapError,
  mergeObjects,
  pipe,
  sequence,
  success,
}
