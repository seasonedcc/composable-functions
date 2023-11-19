import { unknown } from 'https://deno.land/x/zod@v3.22.4/types.ts'
import { toErrorWithMessage } from './errors.ts'
import { Equal } from './types.test.ts'
import {
  Composable,
  ErrorWithMessage,
  Failure,
  First,
  Fn,
  Last,
  MergeObjs,
  Result,
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
 * import { composable as C } from 'domain-functions'
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
  ...fns: T & PipeArguments<T, []>
) {
  return (async (...args) => {
    const res = await sequence(...(fns as T))(...(args as any))
    return !res.success ? error(res.errors) : success(res.data.at(-1))
  }) as PipeReturn<T>
}

type PipeReturn<Fns extends any[]> = Fns extends [
  Composable<(...a: infer PA) => infer OA>,
  Composable<(b: infer PB) => infer OB>,
  ...infer rest,
]
  ? OA extends PB
    ? PipeReturn<[Composable<(...args: PA) => OB>, ...rest]>
    : ['Fail to compose ', OA, ' does not fit in ', PB]
  : Fns extends [Composable<(...args: infer P) => infer O>]
  ? Composable<(...args: P) => O>
  : never

type PipeArguments<Fns extends any[], Arguments extends any[]> = Fns extends [
  Composable<(...a: infer PA) => infer OA>,
  Composable<(b: infer PB) => infer OB>,
  ...infer rest,
]
  ? OA extends PB
    ? PipeArguments<
        [Composable<(...args: PA) => OB>, ...rest],
        [...Arguments, Composable<(...a: PA) => OA>, Composable<(b: PB) => OB>]
      >
    : ['Fail to compose ', OA, ' does not fit in ', PB]
  : Fns extends [Composable<(...args: infer P) => infer O>, ...infer rest]
  ? Arguments
  : never

/**
 * Creates a single function out of multiple Composables. It will pass the same input to each provided function. The functions will run in parallel. If all constituent functions are successful, The data field will be a tuple containing each function's output.
 * @example
 * import { composable as C } from 'domain-functions'
 *
 * const a = C.composable((id: number) => id + 1)
 * const b = C.composable(String)
 * const c = C.composable(Boolean)
 * const cf = C.all(a, b, c)
//       ^? Composable<(id: number) => [string, number, boolean]>
 */
function all<T extends [Composable, ...Composable[]]>(
  ...fns: T & AllArguments<T, []>
) {
  return (async (...args: any) => {
    const results = await Promise.all(fns.map((fn) => fn(...args)))

    if (results.some(({ success }) => success === false)) {
      return error(results.map(({ errors }) => errors).flat())
    }

    return success((results as Success<any>[]).map(({ data }) => data))
  }) as unknown as Composable<
    (...args: Parameters<T[0]>) => {
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Composable>>>
    }
  >
}

type MatchAllArguments<
  TA extends unknown[],
  TB extends unknown[],
  O extends unknown[],
> = TA extends [infer headA, ...infer restA]
  ? TB extends [infer headB, ...infer restB]
    ? headA extends headB
      ? MatchAllArguments<restA, restB, [...O, headB]>
      : headB extends headA
      ? MatchAllArguments<restA, restB, [...O, headA]>
      : { 'Incompatible arguments ': true; argument1: headA; argument2: headB }
    : MatchAllArguments<restA, [], [...O, headA]>
  : TB extends [infer headBNoA, ...infer restBNoA]
  ? MatchAllArguments<[], restBNoA, [...O, headBNoA]>
  : O

type AllArguments<Fns extends any[], Arguments extends any[]> = Fns extends [
  Composable<(...a: infer PA) => infer OA>,
  Composable<(...b: infer PB) => infer OB>,
  ...infer rest,
]
  ? MatchAllArguments<PA, PB, []> extends [...infer MergedP]
    ? rest extends []
      ? [...Arguments, Composable<(...b: MergedP) => OB>]
      : AllArguments<
          [Composable<(...args: MergedP) => OB>, ...rest],
          [
            ...Arguments,
            Composable<(...a: MergedP) => OA>,
            Composable<(...b: MergedP) => OB>,
          ]
        >
    : ['Fail to compose ', PA, ' does not fit in ', PB]
  : Fns extends [Composable, ...infer rest]
  ? rest extends []
    ? Arguments
    : Fns
  : Fns extends []
  ? []
  : never

/**
 * Receives a Record of Composables, runs them all in parallel and preserves the shape of this record for the data property in successful results.
 * @example
 * import { composable as C } from 'domain-functions'
 *
 * const a = C.composable(() => '1')
 * const b = C.composable(() => 2)
 * const df = collect({ a, b })
//       ^? Composable<() => { a: string, b: number }>
 */
function collect<T extends Record<string, Composable>>(fns: T) {
  const [fn, ...fnsWithKey] = Object.entries(fns).map(([key, cf]) =>
    map(cf, (result) => ({ [key]: result })),
  )
  return map(all(fn, ...fnsWithKey), mergeObjects) as Composable<
    (...args: Parameters<Extract<T[keyof T], Composable>>) => {
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Composable>>>
    }
  >
}

/**
 * Works like `pipe` but it will collect the output of every function in a tuple.
 * @example
 * import { composable as C } from 'domain-functions'
 *
 * const a = C.compose((aNumber: number) => String(aNumber))
 * const b = C.compose((aString: string) => aString === '1')
 * const cf = C.sequence(a, b)
 * //    ^? Composable<(aNumber: number) => [string, boolean]>
 */
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

