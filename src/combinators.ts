import type {
  BranchReturn,
  CanComposeInParallel,
  CanComposeInSequence,
  Composable,
  Last,
  MapParametersReturn,
  MergeObjects,
  PipeReturn,
  RecordToTuple,
  Result,
  SequenceReturn,
  Success,
  UnpackData,
} from './types.ts'
import { composable, failure, fromSuccess, success } from './constructors.ts'
import type { Internal } from './internal/types.ts'

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
function mergeObjects<T extends unknown[] = unknown[]>(
  objs: T,
): MergeObjects<T> {
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
 * import { pipe } from 'composable-functions'
 *
 * const a = ({ aNumber }: { aNumber: number }) => ({ aString: String(aNumber) })
 * const b = ({ aString }: { aString: string }) => ({ aBoolean: aString == '1' })
 * const d = pipe(a, b)
 * //    ^? Composable<({ aNumber }: { aNumber: number }) => { aBoolean: boolean }>
 * ```
 */
function pipe<
  Fns extends [Internal.AnyFn, ...Internal.AnyFn[]],
>(
  ...fns: Fns
): PipeReturn<CanComposeInSequence<Internal.Composables<Fns>>> {
  const last = <T extends any[]>(arr: T): Last<T> => arr.at(-1)
  return map(sequence(...fns), last as never) as PipeReturn<
    CanComposeInSequence<Internal.Composables<Fns>>
  >
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
 * import { all } from 'composable-functions'
 *
 * const a = (id: number) => id + 1
 * const b = (x: unknown) => String(x)
 * const c = (x: unknown) => Boolean(x)
 * const cf = all(a, b, c)
 * //     ^? Composable<(id: number) => [string, number, boolean]>
 * ```
 */
function all<Fns extends Internal.AnyFn[]>(
  ...fns: Fns
): Composable<
  (
    ...args: Parameters<
      NonNullable<CanComposeInParallel<Internal.Composables<Fns>>[0]>
    >
  ) => {
    [k in keyof Fns]: UnpackData<Internal.Composables<Fns>[k]>
  }
> {
  const callable = (async (...args) => {
    const results = await Promise.all(fns.map((fn) => composable(fn)(...args)))

    if (results.some(({ success }) => success === false)) {
      return failure(results.map(({ errors }) => errors).flat())
    }

    return success((results as Success[]).map(({ data }) => data))
  }) as Composable<
    (
      ...args: Parameters<
        NonNullable<CanComposeInParallel<Internal.Composables<Fns>>[0]>
      >
    ) => {
      [k in keyof Fns]: UnpackData<Internal.Composables<Fns>[k]>
    }
  >
  callable.kind = 'composable' as const
  return callable
}

/**
 * Composes functions to run in parallel returning a record with same keys as inputs with respective results when all are successful.
 *
 * @example
 *
 * ```ts
 * import { collect } from 'composable-functions'
 *
 * const a = () => '1'
 * const b = () => 2
 * const aComposable = collect({ a, b })
 * //       ^? Composable<() => { a: string, b: number }>
 * ```
 */
function collect<Fns extends Record<string, Internal.AnyFn>>(
  fns: Fns,
): Composable<
  (
    ...args: Parameters<
      Exclude<
        CanComposeInParallel<RecordToTuple<Internal.Composables<Fns>>>[0],
        undefined
      >
    >
  ) => {
    [key in keyof Fns]: UnpackData<Composable<Fns[key]>>
  }
> {
  const fnsWithKey = Object.entries(fns).map(([key, cf]) =>
    map(cf, (result) => ({ [key]: result }))
  )
  const allFns = all(...(fnsWithKey as any)) as Composable
  return map(allFns, mergeObjects) as Composable<
    (
      ...args: Parameters<
        Exclude<
          CanComposeInParallel<RecordToTuple<Internal.Composables<Fns>>>[0],
          undefined
        >
      >
    ) => {
      [key in keyof Fns]: UnpackData<Composable<Fns[key]>>
    }
  >
}

/**
 * Works like `pipe` but it will collect the output of every function in a tuple.
 *
 * @example
 *
 * ```ts
 * import { sequence } from 'composable-functions'
 *
 * const a = (aNumber: number) => String(aNumber)
 * const b = (aString: string) => aString === '1'
 * const cf = sequence(a, b)
 * //    ^? Composable<(aNumber: number) => [string, boolean]>
 * ```
 */

function sequence<
  Fns extends [Internal.AnyFn, ...Internal.AnyFn[]],
>(
  ...fns: Fns
): SequenceReturn<CanComposeInSequence<Internal.Composables<Fns>>> {
  const callable = (async (...args) => {
    const [head, ...tail] = fns

    const res = await composable(head)(...args)
    if (!res.success) return failure(res.errors)

    const result = [res.data]
    for await (const fn of tail) {
      const res = await composable(fn)(result.at(-1))
      if (!res.success) return failure(res.errors)
      result.push(res.data)
    }
    return success(result)
  }) as SequenceReturn<CanComposeInSequence<Internal.Composables<Fns>>>
  callable.kind = 'composable' as const
  return callable
}

/**
 * It takes a Composable and a mapper to apply a transformation over the resulting output. It only runs if the function was successfull. When the given function fails, its error is returned wihout changes.
 * The mapper also receives the original input parameters.
 *
 * @example
 *
 * ```ts
 * import { map } from 'composable-functions'
 *
 * const increment = (n: number) => n + 1
 * const incrementToString = map(increment, String)
 * //    ^? Composable<(n: number) => string>
 * const result = await map(increment, (result, n) => `${n} -> ${result}`)(1)
 * // result === '1 -> 2'
 * ```
 */
function map<Fn extends Internal.AnyFn, O>(
  fn: Fn,
  mapper: (
    res: UnpackData<Composable<Fn>>,
    ...originalInput: Parameters<Fn>
  ) => O | Promise<O>,
): Composable<(...args: Parameters<Fn>) => O> {
  const callable = (async (...args) => {
    const result = await composable(fn)(...args)
    if (!result.success) return failure(result.errors)

    return composable(mapper)(result.data, ...args)
  }) as Composable<(...args: Parameters<Fn>) => O>
  callable.kind = 'composable' as const
  return callable
}

/**
 * It takes a Composable and a function that will map the input parameters to the expected input of the given Composable. Good to adequate the output of a composable into the input of the next composable in a composition. The function must return an array of parameters that will be passed to the Composable.
 * @returns a new Composable that will run the given Composable with the mapped parameters.
 *
 * @example
 *
 * ```ts
 * import { mapParameters } from 'composable-functions'
 *
 * const incrementId = ({ id }: { id: number }) => id + 1
 * const increment = mapParameters(incrementId, (id: number) => [{ id }])
 * //    ^? Composable<(id: number) => number>
 * ```
 */
function mapParameters<
  Fn extends Internal.AnyFn,
  NewParameters extends unknown[],
  const MapperOutput extends Parameters<Composable<Fn>>,
>(
  fn: Fn,
  mapper: (...args: NewParameters) => Promise<MapperOutput> | MapperOutput,
): MapParametersReturn<Composable<Fn>, NewParameters, MapperOutput> {
  const callable = (async (...args) => {
    const output = await composable(mapper)(...args)
    if (!output.success) return failure(output.errors)
    return composable(fn)(...output.data)
  }) as MapParametersReturn<Composable<Fn>, NewParameters, MapperOutput>
  callable.kind = 'composable' as const
  return callable
}

/**
 * Try to recover from a resulting Failure. When the given function succeeds, its result is returned without changes.
 *
 * @example
 *
 * ```ts
 * import { catchFailure } from 'composable-functions'
 *
 * const increment = ({ id }: { id: number }) => id + 1
 * const negativeOnError = catchFailure(increment, (result, originalInput) => (
 *  originalInput.id * -1
 * ))
 * ```
 */
function catchFailure<
  Fn extends Internal.AnyFn,
  C extends (err: Error[], ...originalInput: Parameters<Fn>) => any,
>(
  fn: Fn,
  catcher: C,
): Composable<
  (
    ...args: Parameters<Fn>
  ) => Awaited<ReturnType<C>> extends never[]
    ? UnpackData<Composable<Fn>> extends any[] ? UnpackData<Composable<Fn>>
    : Awaited<ReturnType<C>> | UnpackData<Composable<Fn>>
    : Awaited<ReturnType<C>> | UnpackData<Composable<Fn>>
> {
  const callable = (async (...args: Parameters<Fn>) => {
    const res = await composable(fn)(...args)
    if (res.success) return success(res.data)
    return composable(catcher)(res.errors, ...(args as never))
  }) as Composable<
    (
      ...args: Parameters<Fn>
    ) => Awaited<ReturnType<C>> extends never[]
      ? UnpackData<Composable<Fn>> extends any[] ? UnpackData<Composable<Fn>>
      : Awaited<ReturnType<C>> | UnpackData<Composable<Fn>>
      : Awaited<ReturnType<C>> | UnpackData<Composable<Fn>>
  >
  callable.kind = 'composable' as const
  return callable
}

/**
 * Creates a new function that will apply a transformation over the list of Errors of a Failure from a given function. When the given function succeeds, its result is returned without changes.
 *
 * @example
 *
 * ```ts
 * import { mapErrors } from 'composable-functions'
 *
 * const increment = ({ id }: { id: number }) => id + 1
 * const incrementWithErrorSummary = mapErrors(increment, (result) => ({
 *   errors: [{ message: 'Errors count: ' + result.errors.length }],
 * }))
 * ```
 */
function mapErrors<Fn extends Internal.AnyFn>(
  fn: Fn,
  mapper: (err: Error[]) => Error[] | Promise<Error[]>,
): Composable<Fn> {
  const callable = (async (...args) => {
    const res = await composable(fn)(...args)
    if (res.success) return success(res.data)
    const mapped = await composable(mapper)(res.errors)
    if (mapped.success) {
      return failure(mapped.data)
    } else {
      return failure(mapped.errors)
    }
  }) as Composable<Fn>
  callable.kind = 'composable' as const
  return callable
}

/**
 * Whenever you need to intercept inputs and a composable result without changing them you can use this function.
 * The most common use case is to log failures to the console or to an external service.
 * @param traceFn A function that receives the input and result of a composable.
 *
 * @example
 *
 * ```ts
 * import { trace } from 'composable-functions'
 *
 * const trackErrors = trace((result, ...args) => {
 *   if(!result.success) sendToExternalService({ result, arguments: args })
 * })
 * const increment = (id: number) => id + 1
 * const incrementAndTrackErrors = trackErrors(increment)
 * //    ^? Composable<(id: number) => number>
 * ```
 */
function trace(
  traceFn: (
    result: Result<unknown>,
    ...originalInput: unknown[]
  ) => Promise<void> | void,
): <Fn extends Internal.AnyFn>(
  fn: Fn,
) => Composable<Fn> {
  return ((fn) => {
    const callable = async (...args: any) => {
      const originalResult = await composable(fn)(...args)
      const traceResult = await composable(traceFn)(originalResult, ...args)
      if (traceResult.success) return originalResult

      return failure(traceResult.errors)
    }
    callable.kind = 'composable' as const
    return callable
  }) as <Fn extends Internal.AnyFn>(
    fn: Fn,
  ) => Composable<Fn>
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
  SourceComposable extends Internal.AnyFn,
  Resolver extends (
    o: UnpackData<Composable<SourceComposable>>,
  ) => Composable | null | Promise<Composable | null>,
>(
  cf: SourceComposable,
  // TODO: Make resolver accept plain functions
  resolver: Resolver,
): BranchReturn<Composable<SourceComposable>, Resolver> {
  const callable = (async (...args: Parameters<SourceComposable>) => {
    const result = await composable(cf)(...args)
    if (!result.success) return result

    return composable(async () => {
      const nextComposable = await resolver(result.data)
      if (typeof nextComposable !== 'function') return result.data
      return fromSuccess(nextComposable)(result.data)
    })()
  }) as BranchReturn<Composable<SourceComposable>, Resolver>
  ;(callable as any).kind = 'composable' as const
  return callable
}

export {
  all,
  branch,
  catchFailure,
  collect,
  map,
  mapErrors,
  mapParameters,
  mergeObjects,
  pipe,
  sequence,
  trace,
}
