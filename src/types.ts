import type { Internal } from './internal/types.ts'

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
] ? MergeObjects<rest, Internal.Prettify<Omit<output, keyof first> & first>>
  : output

/**
 * A composable async function that catches failures.
 * We only use this type to make the Composable type neater looking, use `Composable` instead.
 * It does not need to be exported by the library.
 */
type ComposableFunction<T extends Internal.AnyFn = Internal.AnyFn> = {
  (
    ...args: Parameters<T>
  ): Promise<Result<Awaited<ReturnType<T>>>>
  kind: 'composable'
}

/**
 * A composable async function that catches failures.
 */
type Composable<T extends Internal.AnyFn = Internal.AnyFn> = T extends {
  kind: 'composable'
} ? T
  : ComposableFunction<T>
/**
 * A composable async function with schema validation at runtime.
 */
type ComposableWithSchema<O> = Composable<
  (input?: unknown, context?: unknown) => O
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
] ? Composable<(...args: P) => UnpackAll<Fns>>
  : Fns

/**
 * A Composable that represents the sequential execution of multiple Composables.
 * The return type is the success data of the last function in the chain.
 * This type can resolve to a FailToCompose when the composition won't type-check.
 */
type PipeReturn<Fns extends unknown[]> = Fns extends [
  Composable<(...args: infer P) => any>,
  ...any,
] ? Composable<(...args: P) => UnpackData<Extract<Last<Fns>, Composable>>>
  : Fns

/**
 * Determines whether a sequence of Composables can be composed sequentially.
 */
type CanComposeInSequence<
  Fns extends unknown[],
  Arguments extends unknown[] = [],
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
  Fns extends unknown[],
  OriginalFns extends unknown[] = Fns,
> = Fns extends [Composable<(...a: infer PA) => unknown>, ...infer restA]
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
type RecordToTuple<T extends Record<string, (...args: any) => any>> =
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
 * The object used to validate either input or context when creating composables with a schema.
 */
type ParserSchema<T extends unknown = unknown> = {
  safeParse: (a: unknown) =>
    | {
      success: true
      data: T
    }
    | {
      success: false
      error: {
        issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
      }
    }
}

/**
 * Returns the last element of a tuple type.
 */
type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L] ? L
  : never

/**
 * A Composable that branches based on the output of another Composable.
 */
type BranchReturn<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => Internal.AnyFn | null | Promise<Internal.AnyFn | null>,
> = CanComposeInSequence<
  [SourceComposable, Composable<Resolver>]
> extends Composable[]
  ? Awaited<ReturnType<Resolver>> extends null ? SourceComposable
  : CanComposeInSequence<
    [SourceComposable, Awaited<ReturnType<Resolver>>]
  > extends [Composable, ...any] ? Composable<
      (
        ...args: Parameters<
          CanComposeInSequence<
            [SourceComposable, Awaited<ReturnType<Resolver>>]
          >[0]
        >
      ) => null extends Awaited<ReturnType<Resolver>> ?
          | UnpackData<SourceComposable>
          | UnpackData<
            Composable<NonNullable<Awaited<ReturnType<Resolver>>>>
          >
        : UnpackData<
          Composable<NonNullable<Awaited<ReturnType<Resolver>>>>
        >
    >
  : CanComposeInSequence<
    [SourceComposable, Awaited<ReturnType<Resolver>>]
  >
  : CanComposeInSequence<[SourceComposable, Composable<Resolver>]>

/**
 * Ensure that schemas are compatible with composable input and context otherwise return a FailToCompose.
 */
type ApplySchemaReturn<
  ParsedInput,
  ParsedContext,
  Fn extends Composable,
> = ParsedInput extends Parameters<Fn>[0]
  ? ParsedContext extends Parameters<Fn>[1]
    ? ComposableWithSchema<UnpackData<Fn>>
  : FailToCompose<ParsedContext, Parameters<Fn>[1]>
  : FailToCompose<ParsedInput, Parameters<Fn>[0]>

/**
 * The return type of the mapParameters function
 */
type MapParametersReturn<
  Fn extends Composable,
  NewParams extends unknown[],
  O extends Parameters<Fn>,
> = Composable<
  (
    ...args: NewParams
  ) => Internal.IsNever<O> extends true ? never : UnpackData<Fn>
>

// Re-exporting internal types
/**
 * A type that represents an error when composing functions with incompatible arguments.
 */
type IncompatibleArguments = Internal.IncompatibleArguments
/**
 * This is IncompatibleArguments supertype where we include the arguments that caused the incompatibility.
 */
type FailToCompose<A, B> = Internal.FailToCompose<A, B>

export type {
  ApplySchemaReturn,
  BranchReturn,
  CanComposeInParallel,
  CanComposeInSequence,
  Composable,
  ComposableWithSchema,
  FailToCompose,
  Failure,
  IncompatibleArguments,
  Last,
  MapParametersReturn,
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
