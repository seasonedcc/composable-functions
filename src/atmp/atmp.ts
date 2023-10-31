import { toErrorWithMessage } from './errors.ts'
import {
  Attempt,
  ErrorWithMessage,
  First,
  Fn,
  Last,
  Result,
  Success,
  UnpackAll,
  UnpackResult,
} from './types.ts'
import { mergeObjects } from '../utils.ts'

function atmp<T extends Fn>(fn: T): Attempt<T> {
  return async (...args) => {
    try {
      // deno-lint-ignore no-explicit-any
      const result = await fn(...(args as any[]))
      return {
        success: true,
        data: result,
        errors: [],
      }
    } catch (e) {
      return {
        success: false,
        errors: [toErrorWithMessage(e)],
      }
    }
  }
}

function pipe<T extends [Attempt, ...Attempt[]]>(...fns: T) {
  return (async (...args) => {
    const res = await sequence(...fns)(...args)
    return !res.success
      ? { success: false, errors: res.errors }
      : { success: true, data: res.data.at(-1), errors: [] }
  }) as Attempt<
    (
      ...args: Parameters<Extract<First<T>, Attempt>>
    ) => UnpackResult<ReturnType<Extract<Last<T>, Attempt>>>
  >
}

function isListOfSuccess<T>(result: Result<T>[]): result is Success<T>[] {
  return result.every(({ success }) => success === true)
}

function all<T extends [Attempt, ...Attempt[]]>(...fns: T) {
  return (async (...args: any) => {
    const results = await Promise.all(fns.map((fn) => fn(...args)))

    if (!isListOfSuccess(results)) {
      return {
        success: false,
        errors: results.map(({ errors }) => errors).flat(),
      }
    }

    return { success: true, data: results.map(({ data }) => data), errors: [] }
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
    if (!res.success) return { success: false, errors: res.errors }

    const result = [res.data]
    for await (const fn of tail) {
      const res = await fn(result.at(-1))
      if (!res.success) return { success: false, errors: res.errors }
      result.push(res.data)
    }
    return { success: true, data: result, errors: [] }
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
    return !res.success
      ? { success: false, errors: res.errors }
      : { success: true, data: mapper(res.data), errors: [] }
  }) as Attempt<(...args: Parameters<T>) => R>
}

function mapError<T extends Attempt, R>(
  fn: T,
  mapper: (err: ErrorWithMessage) => ErrorWithMessage,
) {
  return (async (...args) => {
    const res = await fn(...args)
    return !res.success
      ? { success: false, errors: res.errors.map(mapper) }
      : { success: true, data: res.data, errors: [] }
  }) as T
}

export { all, atmp, collect, map, mapError, pipe, sequence }

