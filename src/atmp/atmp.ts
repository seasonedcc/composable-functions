import { toErrorWithMessage } from './errors.ts'
import {
  Attempt,
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

function atmp<T extends Fn>(fn: T): Attempt<T> {
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

function pipe<T extends [Attempt, ...Attempt[]]>(...fns: T) {
  return (async (...args) => {
    const res = await sequence(...fns)(...args)
    return !res.success ? error(res.errors) : success(res.data.at(-1))
  }) as Attempt<
    (
      ...args: Parameters<Extract<First<T>, Attempt>>
    ) => UnpackResult<ReturnType<Extract<Last<T>, Attempt>>>
  >
}

function all<T extends [Attempt, ...Attempt[]]>(...fns: T) {
  return (async (...args: any) => {
    const results = await Promise.all(fns.map((fn) => fn(...args)))

    if (results.some(({ success }) => success === false)) {
      return error(results.map(({ errors }) => errors).flat())
    }

    return success((results as Success<any>[]).map(({ data }) => data))
  }) as unknown as Attempt<
    (...args: Parameters<Extract<T[keyof T], Attempt>>) => {
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Attempt>>>
    }
  >
}

function collect<T extends Record<string, Attempt>>(fns: T) {
  const [fn, ...fnsWithKey] = Object.entries(fns).map(([key, df]) =>
    map(df, (result) => ({ [key]: result })),
  )
  return map(all(fn, ...fnsWithKey), mergeObjects) as Attempt<
    (...args: Parameters<Extract<T[keyof T], Attempt>>) => {
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Attempt>>>
    }
  >
}

function sequence<T extends [Attempt, ...Attempt[]]>(...fns: T) {
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
  }) as Attempt<
    (...args: Parameters<Extract<First<T>, Attempt>>) => UnpackAll<T>
  >
}

function map<T extends Attempt, R>(
  fn: T,
  mapper: (res: UnpackResult<ReturnType<T>>) => R,
) {
  return (async (...args) => {
    const res = await fn(...args)
    if(!res.success) return error(res.errors)
    const mapped = await atmp(mapper)(res.data)
    if(!mapped.success) return error(mapped.errors)
    return mapped
  }) as Attempt<(...args: Parameters<T>) => R>
}

function mapError<T extends Attempt, R>(
  fn: T,
  mapper: (err: ErrorWithMessage) => ErrorWithMessage,
) {
  return (async (...args) => {
    const res = await fn(...args)
    return !res.success ? error(res.errors.map(mapper)) : success(res.data)
  }) as T
}

export {
  all,
  atmp,
  collect,
  error,
  map,
  mapError,
  mergeObjects,
  pipe,
  sequence,
  success,
}

