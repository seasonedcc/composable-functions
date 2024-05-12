import type {
  BranchReturn,
  CanComposeInParallel,
  CanComposeInSequence,
  Composable,
  MergeObjs,
  PipeReturn,
  RecordToTuple,
  Result,
  SequenceReturn,
  Success,
  UnpackData,
} from './types.ts'
import { composable, failure, fromSuccess, success } from './constructors.ts'
import { ErrorList } from './errors.ts'
import { Internal } from './internal/types.ts'

/**
 * Merges a list of objects into a single object.
 *
 * It is a type-safe version of Object.assign.
 *
 * @param objs the list of objects to merge
 * @returns the merged object
 *
 * @example
 *
 * ```ts
 * const obj1 = { a: 1, b: 2 }
 * const obj2 = { c: 3 }
 * const obj3 = { d: 4 }
 * const merged = mergeObjects([obj1, obj2, obj3])
 * //   ^? { a: number, b: number, c: number, d: number }
 * ```
 */
function mergeObjects<T extends unknown[] = unknown[]>(objs: T): MergeObjs<T> {
  return Object.assign({}, ...objs)
}

/**
 * Composes functions to run in sequence returning the result of the rightmost function when all are successful. 
 * 
 * It will pass the output of a function as the next function's input in left-to-right order. 
 *
 * @param {Fns} fns the list of composables to run in sequence
 * @returns a composable that runs the pipe
 *
 * @example
 *
 * ```ts
 * import { composable, pipe } from 'composable-functions'
 *
 * const a = composable(
 *   ({ aNumber }: { aNumber: number }) => ({ aString: String(aNumber) }),
 * )
 * const b = composable(
 *   ({ aString }: { aString: string }) => ({ aBoolean: aString == '1' }),
 * )
 * const d = pipe(a, b)
 * //    ^? Composable<({ aNumber }: { aNumber: number }) => { aBoolean: boolean }>
 * ```
 */
function pipe<Fns extends [Composable, ...Composable[]]>(...fns: Fns) {
  return (async (...args: any[]) => {
    const res = await sequence(...fns)(...args)
    return !res.success
      ? failure(res.errors)
      : success(res.data[res.data.length - 1])
  }) as PipeReturn<CanComposeInSequence<Fns>>
}

/**
 * Composes functions to run in parallel returning a tuple of all results when all are successful. 
 *
 * It will pass the same input to each provided function. The functions will run in parallel. 
 *
 * @param {Fns} fns the list of composables to run in parallel
 * @returns a new composable that runs all inputs
 *
 * @example
 *
 * ```ts
 * import { composable, all } from 'composable-functions'
 *
 * const a = composable((id: number) => id + 1)
 * const b = composable(String)
 * const c = composable(Boolean)
 * const cf = all(a, b, c)
 * //     ^? Composable<(id: number) => [string, number, boolean]>
 * ```
 */
function all<Fns extends Composable[]>(...fns: Fns) {
  return (async (...args) => {
    const results = await Promise.all(fns.map((fn) => fn(...args)))

    if (results.some(({ success }) => success === false)) {
      return failure(results.map(({ errors }) => errors).flat())
    }

    return success((results as Success[]).map(({ data }) => data))
  }) as Composable<
    (...args: Parameters<NonNullable<CanComposeInParallel<Fns>[0]>>) => {
      [k in keyof Fns]: UnpackData<Fns[k]>
    }
  >
}

/**
 * Composes functions to run in parallel returning a record with same keys as inputs with respective results when all are successful. 
 *
 * @example
 *
 * ```ts
 * import { composable, collect } from 'composable-functions'
 *
 * const a = composable(() => '1')
 * const b = composable(() => 2)
 * const aComposable = collect({ a, b })
 * //       ^? Composable<() => { a: string, b: number }>
 * ```
 */
function collect<Fns extends Record<string, Composable>>(fns: Fns) {
  const fnsWithKey = Object.entries(fns).map(([key, cf]) =>
    map(cf, (result) => ({ [key]: result }))
  )
  return map(all(...(fnsWithKey as any)), mergeObjects) as Composable<
    (
      ...args: Parameters<
        Exclude<CanComposeInParallel<RecordToTuple<Fns>>[0], undefined>
      >
    ) => {
      [key in keyof Fns]: UnpackData<Fns[key]>
    }
  >
}

/**
 * Works like `pipe` but it will collect the output of every function in a tuple.
 *
 * @example
 *
 * ```ts
 * import { composable, sequence } from 'composable-functions'
 *
 * const a = composable((aNumber: number) => String(aNumber))
 * const b = composable((aString: string) => aString === '1')
 * const cf = sequence(a, b)
 * //    ^? Composable<(aNumber: number) => [string, boolean]>
 * ```
 */
function sequence<Fns extends [Composable, ...Composable[]]>(...fns: Fns) {
  return (async (...args) => {
    const [head, ...tail] = fns

    const res = await head(...args)
    if (!res.success) return failure(res.errors)

    const result = [res.data]
    for await (const fn of tail) {
      const res = await fn(result.at(-1))
      if (!res.success) return failure(res.errors)
      result.push(res.data)
    }
    return success(result)
  }) as SequenceReturn<CanComposeInSequence<Fns>>
}

/**
 * It takes a Composable and a predicate to apply a transformation over the resulting `data`. It only runs if the function was successfull. When the given function fails, its error is returned wihout changes.
 * @example
 * import { composable, map } from 'composable-functions'
 *
 * const increment = composable(({ id }: { id: number }) => id + 1)
 * const incrementToString = map(increment, String)
 * //    ^? Composable<({ id }: { id: number }) => string>
 */
function map<Fn extends Composable, O>(
  fn: Fn,
  mapper: (res: UnpackData<Fn>) => O,
): Composable<(...args: Parameters<Fn>) => O> {
  return pipe(fn as Composable, composable(mapper) as Composable)
}

/**
 * It takes a Composable and a function that will map the input parameters to the expected input of the given Composable. Good to adequate the output of a composable into the input of the next composable in a composition. The function must return an array of parameters that will be passed to the Composable.
 * @returns a new Composable that will run the given Composable with the mapped parameters.
 * @example
 * import { composable, mapParameters } from 'composable-functions'
 *
 * const incrementId = composable(({ id }: { id: number }) => id + 1)
 * const increment = mapParameters(incrementId, (id: number) => [{ id }])
 * //    ^? Composable<(id: number) => number>
 */
function mapParameters<
  Fn extends Composable,
  NewParameters extends unknown[],
  const O extends Parameters<Fn>,
>(
  fn: Fn,
  mapper: (...args: NewParameters) => Promise<O> | O,
): Composable<
  (
    ...args: NewParameters
  ) => Internal.IsNever<Awaited<O>> extends true ? never : UnpackData<Fn>
> {
  return async (...args) => {
    const output = await composable(mapper)(...args)
    if (!output.success) return failure(output.errors)
    return fn(...output.data)
  }
}

/**
 * **NOTE :** Try to use [collect](collect) instead wherever possible since it is much safer. `merge` can create composables that will always fail in run-time or even overwrite data from successful constituent functions application. The `collect` function does not have these issues and serves a similar purpose.
 * @example
 * import { withSchema, merge } from 'composable-functions'
 *
 * const a = withSchema(z.object({}))(() => ({ a: 'a' }))
 * const b = withSchema(z.object({}))(() => ({ b: 2 }))
 * const aComposable = merge(a, b)
 * //    ^? Composable<(input?: unknown, environment?: unknown) => { a: string, b: number }>
 */
function merge<Fns extends Composable[]>(
  ...fns: Fns
): Composable<
  (
    ...args: Parameters<NonNullable<CanComposeInParallel<Fns>[0]>>
  ) => MergeObjs<
    {
      [key in keyof Fns]: UnpackData<Fns[key]>
    }
  >
> {
  return map(all(...(fns as never)), mergeObjects)
}

/**
 * Creates a composable that will return the result of the first successful constituent. **It is important to notice** that all constituent functions will be executed in parallel, so be mindful of the side effects.
 * @example
 * import { withSchema, first } from 'composable-functions'
 *
 * const a = withSchema(z.object({ n: z.number() }))(({ n }) => n + 1)
const b = withSchema(z.object({ n: z.number() }))(({ n }) => String(n))
const aComposable = first(a, b)
//    ^? Composable<(input?: unknown, environment?: unknown) => string | number>
 */
function first<Fns extends Composable[]>(...fns: Fns) {
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
      ...args: Parameters<NonNullable<CanComposeInParallel<Fns>[0]>>
    ) => UnpackData<Fns[number]>
  >
}

/**
 * Creates a new function that will try to recover from a resulting Failure. When the given function succeeds, its result is returned without changes.
 * @example
 * import { composable, catchError } from 'composable-functions'
 *
 * const increment = composable(({ id }: { id: number }) => id + 1)
 * const negativeOnError = catchError(increment, (result, originalInput) => (
 *  originalInput.id * -1
 * ))
 */
function catchError<
  Fn extends Composable,
  C extends (err: Error[], ...originalInput: Parameters<Fn>) => any,
>(
  fn: Fn,
  catcher: C,
): Composable<
  (
    ...args: Parameters<Fn>
  ) => Awaited<ReturnType<C>> extends never[]
    ? UnpackData<Fn> extends any[] ? UnpackData<Fn>
    : Awaited<ReturnType<C>> | UnpackData<Fn>
    : Awaited<ReturnType<C>> | UnpackData<Fn>
> {
  return async (...args: Parameters<Fn>) => {
    const res = await fn(...args)
    if (res.success) return success(res.data)
    return composable(catcher)(res.errors, ...(args as never))
  }
}

/**
 * Creates a new function that will apply a transformation over a resulting Failure from the given function. When the given function succeeds, its result is returned without changes.
 * @example
 * import { composable, mapError } from 'composable-functions'
 *
 * const increment = composable(({ id }: { id: number }) => id + 1)
 * const incrementWithErrorSummary = mapError(increment, (result) => ({
 *   errors: [{ message: 'Errors count: ' + result.errors.length }],
 * }))
 */
function mapError<Fn extends Composable>(
  fn: Fn,
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
  }) as Fn
}

/**
 * Whenever you need to intercept inputs and a composable result without changing them you can use this function.
 * The most common use case is to log failures to the console or to an external service.
 * @param traceFn A function that receives the input and result of a composable.
 * @example
 * import { withSchema, trace } from 'composable-functions'
 *
 * const trackErrors = trace(({ input, output, result }) => {
 *   if(!result.success) sendToExternalService({ input, output, result })
 * })
 * const increment = withSchema(z.object({ id: z.number() }))(({ id }) => id + 1)
 * const incrementAndTrackErrors = trackErrors(increment)
 * //    ^? Composable<(input?: unknown, environment?: unknown) => number>
 */
function trace(
  traceFn: (
    result: Result<unknown>,
    ...originalInput: unknown[]
  ) => Promise<void> | void,
) {
  return <Fn extends Composable>(fn: Fn) =>
    (async (...args) => {
      const originalResult = await fn(...args)
      const traceResult = await composable(traceFn)(originalResult, ...args)
      if (traceResult.success) return originalResult

      return failure(traceResult.errors)
    }) as Fn
}

/**
 * Compose 2 functions conditionally.
 *
 * Uses a resolver to decide whether it should just call the first function or pipe its result into a second function returned by the resolver.
 * 
 * @param cf first composable to be called
 * @param resolver when it returns null aborts the composition or else returns the next composable in the chain.
 * @returns a new composable with the conditional pipe.
 *
 * @example
 *
 * ```ts
 * import { composable, branch } from 'composable-functions'
 *
 * const increment = composable(
 *   (a: number) => a + 1
 * )
 * const makeItEven = (sum: number) => sum % 2 != 0 ? increment : null
 * const incrementUntilEven = branch(increment, makeItEven)
 * ```
 */
function branch<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => Composable | null | Promise<Composable | null>,
>(cf: SourceComposable, resolver: Resolver): BranchReturn<SourceComposable, Resolver> {
  return (async (...args: Parameters<SourceComposable>) => {
    const result = await cf(...args)
    if (!result.success) return result

    return composable(async () => {
      const nextComposable = await resolver(result.data)
      if (typeof nextComposable !== 'function') return result.data
      return fromSuccess(nextComposable)(result.data)
    })()
  }) as BranchReturn<SourceComposable, Resolver>
}

export {
  all,
  branch,
  catchError,
  collect,
  first,
  map,
  mapError,
  mapParameters,
  merge,
  mergeObjects,
  pipe,
  sequence,
  trace,
}
