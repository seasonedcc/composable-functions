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
 * Any function.
 * It is only exported so generated declaration files can reference it.
 * It is an implementation detail: avoid using it directly, as it may change without notice.
 */
type AnyFn = (...args: any[]) => any

/**
 * A composable async function that catches failures.
 * We only use this type to make the Composable type neater looking, use `Composable` instead.
 * It does not need to be exported by the library.
 */
type ComposableFunction<T extends AnyFn = AnyFn> = {
  (
    ...args: Parameters<T>
  ): Promise<Result<Awaited<ReturnType<T>>>>
  kind: 'composable'
}

/**
 * A composable async function that catches failures.
 */
type Composable<T extends AnyFn = AnyFn> = T extends {
  kind: 'composable'
} ? T
  : ComposableFunction<T>

/**
 * Maps a list or record of functions to their Composable versions.
 * It is only exported so generated declaration files can reference it.
 * It is an implementation detail: avoid using it directly, as it may change without notice.
 */
type Composables<
  Fns extends Record<string, Function> | Array<Function>,
> = {
  [K in keyof Fns]: Composable<Extract<Fns[K], AnyFn>>
}

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
      ? FailToCompose<never, FirstBParameter>
    : Awaited<OA> extends FirstBParameter
      ? Internal.EveryElementTakes<PB, undefined> extends true
        ? CanComposeInSequence<
          restA,
          [...Arguments, Composable<(...a: PA) => OA>]
        >
      : Internal.EveryElementTakes<PB, undefined>
    : FailToCompose<Awaited<OA>, FirstBParameter>
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
    : FailToCompose<PA, PB>
  : Internal.ApplyArgumentsToFns<OriginalFns, PA>
  : never

// Thanks to https://github.com/tjjfvi
// UnionToTuple code lifted from this thread: https://github.com/microsoft/TypeScript/issues/13298#issuecomment-707364842
// This will not preserve union order but we don't care since this is for Composable paralel application
/**
 * Transforms a union into a tuple. The order of the union is not preserved.
 * It is only exported so generated declaration files can reference it.
 * It is an implementation detail: avoid using it directly, as it may change without notice.
 */
type UnionToTuple<T> = (
  (T extends any ? (t: T) => T : never) extends infer U
    ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any ? V
    : never
    : never
) extends (_: any) => infer W ? [...UnionToTuple<Exclude<T, W>>, W]
  : []

/**
 * Extracts the values of a record into a tuple, following the order of a tuple of keys.
 * It is only exported so generated declaration files can reference it.
 * It is an implementation detail: avoid using it directly, as it may change without notice.
 */
type RecordValuesFromKeysTuple<
  R extends Record<string, unknown>,
  K extends unknown[],
  ValuesTuple extends unknown[] = [],
> = K extends [infer Head, ...infer rest]
  ? Head extends string
    ? rest extends string[]
      ? RecordValuesFromKeysTuple<R, rest, [...ValuesTuple, R[Head]]>
    : never
  : ValuesTuple
  : ValuesTuple

/**
 * Transforms a record of Composables into a tuple of their return types.
 */
type RecordToTuple<T extends Record<string, (...args: any) => any>> =
  RecordValuesFromKeysTuple<T, Internal.Keys<T>>

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
  ) => AnyFn | null | Promise<AnyFn | null>,
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
  Fn extends AnyFn,
> = ParsedInput extends Parameters<Fn>[0]
  ? ParsedContext extends Parameters<Fn>[1]
    ? Awaited<ReturnType<Fn>> extends never ? ComposableWithSchema<never>
    : Awaited<ReturnType<Fn>> extends Result<infer O> ? ComposableWithSchema<O>
    : ComposableWithSchema<Awaited<ReturnType<Fn>>>
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

/**
 * A type that represents an error when composing functions with incompatible arguments.
 */
type IncompatibleArguments = {
  'Incompatible arguments ': true
}

/**
 * This is IncompatibleArguments supertype where we include the arguments that caused the incompatibility.
 */
type FailToCompose<A, B> = IncompatibleArguments & {
  argument1: A
  argument2: B
}

export type {
  AnyFn,
  ApplySchemaReturn,
  BranchReturn,
  CanComposeInParallel,
  CanComposeInSequence,
  Composable,
  Composables,
  ComposableWithSchema,
  FailToCompose,
  Failure,
  IncompatibleArguments,
  Last,
  MapParametersReturn,
  MergeObjects,
  PipeReturn,
  RecordToTuple,
  RecordValuesFromKeysTuple,
  Result,
  SequenceReturn,
  SerializableError,
  SerializableResult,
  Success,
  UnionToTuple,
  UnpackAll,
  UnpackData,
}
