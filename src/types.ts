import { Internal } from './internal/types.ts'

/**
 * The failure case of a Result.
 * It has a list of Errors.
 */
type Failure = {
  success: false
  errors: Array<Error>
}

/**
 * The success case of a Result.
 * It has a generic T as the data.
 * It also has an empty list of errors for convenience.
 */
type Success<T = void> = {
  success: true
  data: T
  errors: []
}

/**
 * The output of a computation that might fail.
 */
type Result<T = void> = Success<T> | Failure

/**
 * Merges the data types of a list of objects.
 * @example
 * type MyObjs = [
 *   { a: string },
 *   { b: number },
 * ]
 * type MyData = MergeObjects<MyObjs>
 * //   ^? { a: string, b: number }
 */
type MergeObjects<Objs extends unknown[], output = {}> = Objs extends [
  infer first,
  ...infer rest,
]
  ? MergeObjects<rest, Internal.Prettify<Omit<output, keyof first> & first>>
  : output

/**
 * A composable async function that catches failures.
 */
type Composable<T extends (...args: any[]) => any = (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<Result<Awaited<ReturnType<T>>>>

/**
 * A composable async function with schema validation at runtime.
 */
type ComposableWithSchema<O> = Composable<
  (input?: unknown, environment?: unknown) => O
>

/**
 * Extract the type of the returned data when a Composable is successful.
 */
type UnpackData<T extends Composable> = Extract<
  Awaited<ReturnType<T>>,
  { success: true }
>['data']

/**
 * Extracts the types of successful data returned by multiple Composables.
 */
type UnpackAll<List extends Composable[]> = {
  [K in keyof List]: UnpackData<List[K]>
}

/**
 * A Composable that represents the sequential execution of multiple Composables.
 * The return type is a tuple with all results on the success data.
 * This type can resolve to a FailToCompose when the composition won't type-check.
 */
type SequenceReturn<Fns extends unknown[]> = Fns extends [
  Composable<(...args: infer P) => any>,
  ...any,
]
  ? Composable<(...args: P) => UnpackAll<Fns>>
  : Fns

/**
 * A Composable that represents the sequential execution of multiple Composables.
 * The return type is the success data of the last function in the chain.
 * This type can resolve to a FailToCompose when the composition won't type-check.
 */
type PipeReturn<Fns extends unknown[]> = Fns extends [
  Composable<(...args: infer P) => any>,
  ...any,
]
  ? Composable<(...args: P) => UnpackData<Extract<Last<Fns>, Composable>>>
  : Fns

/**
 * Determines whether a sequence of Composables can be composed sequentially.
 */
type CanComposeInSequence<
  Fns extends any[],
  Arguments extends any[] = [],
> = Fns extends [Composable<(...a: infer PA) => infer OA>, ...infer restA]
  ? restA extends [
      Composable<
        (firstParameter: infer FirstBParameter, ...b: infer PB) => any
      >,
      ...unknown[],
    ]
    ? Internal.IsNever<Awaited<OA>> extends true
      ? Internal.FailToCompose<never, FirstBParameter>
      : Awaited<OA> extends FirstBParameter
      ? Internal.EveryElementTakes<PB, undefined> extends true
        ? CanComposeInSequence<
            restA,
            [...Arguments, Composable<(...a: PA) => OA>]
          >
        : Internal.EveryElementTakes<PB, undefined>
      : Internal.FailToCompose<Awaited<OA>, FirstBParameter>
    : [...Arguments, Composable<(...a: PA) => OA>]
  : never

/**
 * Determines whether a sequence of Composables can be composed in parallel.
 */
type CanComposeInParallel<
  Fns extends any[],
  OriginalFns extends any[] = Fns,
> = Fns extends [Composable<(...a: infer PA) => any>, ...infer restA]
  ? restA extends [Composable<(...b: infer PB) => infer OB>, ...infer restB]
    ? Internal.SubtypesTuple<PA, PB> extends [...infer MergedP]
      ? CanComposeInParallel<
          [Composable<(...args: MergedP) => OB>, ...restB],
          OriginalFns
        >
      : Internal.FailToCompose<PA, PB>
    : Internal.ApplyArgumentsToFns<OriginalFns, PA>
  : never

/**
 * Transforms a record of Composables into a tuple of their return types.
 */
type RecordToTuple<T extends Record<string, Composable>> =
  Internal.RecordValuesFromKeysTuple<T, Internal.Keys<T>>

/**
 * A serializable error object.
 */
type SerializableError = {
  exception: Error
  message: string
  name: string
  path: string[]
}

/**
 * The serializable output of a Result.
 */
type SerializableResult<T> =
  | Success<T>
  | { success: false; errors: SerializableError[] }

/**
 * The object used to validate either input or environment when creating composables with a schema.
 */
type ParserSchema<T extends unknown = unknown> = {
  safeParse: (a: unknown) =>
    | {
        success: true
        data: T
      }
    | {
        success: false
        error: { issues: { path: Array<string | number>; message: string }[] }
      }
}

/**
 * Returns the last element of a tuple type.
 */
type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L]
  ? L
  : never

/**
 * A Composable that branches based on the output of another Composable.
 */
type BranchReturn<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => Composable | null | Promise<Composable | null>,
> = CanComposeInSequence<
  [SourceComposable, Composable<Resolver>]
> extends Composable[]
  ? Awaited<ReturnType<Resolver>> extends null
    ? SourceComposable
    : CanComposeInSequence<
        [SourceComposable, Awaited<ReturnType<Resolver>>]
      > extends [Composable, ...any]
    ? Composable<
        (
          ...args: Parameters<
            CanComposeInSequence<
              [SourceComposable, Awaited<ReturnType<Resolver>>]
            >[0]
          >
        ) => null extends Awaited<ReturnType<Resolver>>
          ?
              | UnpackData<SourceComposable>
              | UnpackData<Extract<Awaited<ReturnType<Resolver>>, Composable>>
          : UnpackData<Extract<Awaited<ReturnType<Resolver>>, Composable>>
      >
    : CanComposeInSequence<[SourceComposable, Awaited<ReturnType<Resolver>>]>
  : CanComposeInSequence<[SourceComposable, Composable<Resolver>]>

export type {
  BranchReturn,
  CanComposeInParallel,
  CanComposeInSequence,
  Composable,
  ComposableWithSchema,
  Failure,
  Last,
  MergeObjects,
  ParserSchema,
  PipeReturn,
  RecordToTuple,
  Result,
  SequenceReturn,
  SerializableError,
  SerializableResult,
  Success,
  UnpackAll,
  UnpackData,
}
