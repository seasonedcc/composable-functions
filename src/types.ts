import { Internal } from './internal/types.ts'

type Failure = {
  success: false
  errors: Array<Error>
}

type Success<T = void> = {
  success: true
  data: T
  errors: []
}

type Result<T = void> = Success<T> | Failure

/**
 * Merges the data types of a list of objects.
 * @example
 * type MyObjs = [
 *   { a: string },
 *   { b: number },
 * ]
 * type MyData = MergeObjs<MyObjs>
 * //   ^? { a: string, b: number }
 */
type MergeObjs<Objs extends unknown[], output = {}> = Objs extends [
  infer first,
  ...infer rest,
] ? MergeObjs<rest, Internal.Prettify<Omit<output, keyof first> & first>>
  : output

type Composable<T extends (...args: any[]) => any = (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<Result<Awaited<ReturnType<T>>>>

type UnpackData<T extends Composable> = Extract<
  Awaited<ReturnType<T>>,
  { success: true }
>['data']

type UnpackAll<List extends Composable[]> = {
  [K in keyof List]: UnpackData<List[K]>
}

type SequenceReturn<Fns extends Composable[]> = Fns extends [
  Composable<(...args: infer P) => any>,
  ...any,
] ? Composable<(...args: P) => UnpackAll<Fns>>
  : Fns

type PipeReturn<Fns extends Composable[]> = Fns extends [
  Composable<(...args: infer P) => any>,
  ...any,
] ? Composable<(...args: P) => UnpackData<Extract<Last<Fns>, Composable>>>
  : Fns

type PipeArguments<
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
        ? PipeArguments<restA, [...Arguments, Composable<(...a: PA) => OA>]>
      : Internal.EveryElementTakes<PB, undefined>
    : Internal.FailToCompose<Awaited<OA>, FirstBParameter>
  : [...Arguments, Composable<(...a: PA) => OA>]
  : never

type AllArguments<
  Fns extends any[],
  OriginalFns extends any[] = Fns,
> = Fns extends [Composable<(...a: infer PA) => any>, ...infer restA]
  ? restA extends [Composable<(...b: infer PB) => infer OB>, ...infer restB]
    ? Internal.SubtypesTuple<PA, PB> extends [...infer MergedP] ? AllArguments<
        [Composable<(...args: MergedP) => OB>, ...restB],
        OriginalFns
      >
    : Internal.FailToCompose<PA, PB>
  : Internal.ApplyArgumentsToFns<OriginalFns, PA>
  : never

type RecordToTuple<T extends Record<string, Composable>> =
  Internal.RecordValuesFromKeysTuple<T, Internal.Keys<T>>

type SerializableError<T extends Error = Error> = {
  exception: T
  message: string
  name: string
  path: string[]
}

type SerializedResult<T> =
  | Success<T>
  | { success: false; errors: SerializableError[] }

/**
 * The object used to validate either input or environment when creating domain functions.
 */
type ParserSchema<T extends unknown = unknown> = {
  safeParseAsync: (a: unknown) => Promise<
    | {
      success: true
      data: T
    }
    | {
      success: false
      error: { issues: { path: PropertyKey[]; message: string }[] }
    }
  >
}

type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L] ? L
  : never

type BranchReturn<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => Composable | null | Promise<Composable | null>,
> = PipeArguments<[SourceComposable, Composable<Resolver>]> extends Composable[]
  ? ReturnType<Resolver> extends null | Promise<null>
    ? SourceComposable
    : ReturnType<Resolver> extends Promise<infer CorNULL>
    ? null extends CorNULL
      ?
          | PipeReturn<
              PipeArguments<[SourceComposable, Extract<CorNULL, Composable>]>
            >
          | SourceComposable
      : PipeReturn<
          PipeArguments<[SourceComposable, Extract<CorNULL, Composable>]>
        >
    : null extends ReturnType<Resolver>
    ?
        | PipeReturn<
            PipeArguments<
              [SourceComposable, Extract<ReturnType<Resolver>, Composable>]
            >
          >
        | SourceComposable
    : PipeReturn<
        PipeArguments<
          [SourceComposable, Extract<ReturnType<Resolver>, Composable>]
        >
      >
  : PipeArguments<[SourceComposable, Composable<Resolver>]>
//
// Testing resolver compatibility
type X1 = BranchReturn<Composable<() => number>, () => null>
type X2 = BranchReturn<Composable<() => number>, (i: string) => null>
type X3 = BranchReturn<Composable<() => number>, (i: number) => null>
type X31 = BranchReturn<Composable<() => number>, (i: number) => Promise<null>>

// Testing second composable compatibility
type X4 = BranchReturn<
  Composable<() => number>,
  (i: number) => Composable<(i: string) => number>
>
//
// Testing second composable compatibility when we have more than one possible type with one incompatible
type X5 = BranchReturn<
  Composable<() => number>,
  (
    i: number,
  ) => Composable<(i: string) => number> | Composable<(i: number) => boolean>
>
// Testing second composable compatibility when we have more than one possible compatible type
type X6 = BranchReturn<
  Composable<() => { s: string; n: number }>,
  (i: {
    n: number
  }) =>
    | Composable<(i: { s: string }) => number>
    | Composable<(i: { n: number }) => boolean>
>
type X7 = BranchReturn<
  Composable<() => number>,
  (
    i: number,
  ) => Composable<(i: number) => number> | Composable<(i: number) => boolean>
>

// Resolver is async
type X8 = BranchReturn<
  Composable<() => number>,
  (
    i: number,
  ) => Promise<
    Composable<(i: number) => number> | Composable<(i: number) => boolean>
  >
>
//
// Resolver might return null
type X9 = BranchReturn<
  Composable<() => number>,
  (i: number) => Composable<(i: number) => boolean> | null
>
// Resolver might return null in promise
type X10 = BranchReturn<
  Composable<() => number>,
  (i: number) => Promise<Composable<(i: number) => boolean> | null>
>

export type {
  AllArguments,
  BranchReturn,
  Composable,
  Failure,
  Last,
  MergeObjs,
  ParserSchema,
  PipeArguments,
  PipeReturn,
  RecordToTuple,
  Result,
  SequenceReturn,
  SerializableError,
  SerializedResult,
  Success,
  UnpackAll,
  UnpackData,
}
