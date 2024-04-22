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
]
  ? MergeObjs<rest, Internal.Prettify<Omit<output, keyof first> & first>>
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

type PipeReturn<Fns extends any[]> = Fns extends [
  Composable<(...a: infer PA) => infer OA>,
  Composable<(b: infer PB) => infer OB>,
  ...infer rest,
]
  ? Internal.IsNever<OA> extends true
    ? ['Fail to compose, "never" does not fit in', PB]
    : Awaited<OA> extends PB
    ? PipeReturn<[Composable<(...args: PA) => OB>, ...rest]>
    : ['Fail to compose', Awaited<OA>, 'does not fit in', PB]
  : Fns extends [Composable<(...args: infer P) => infer O>]
  ? Composable<(...args: P) => O>
  : never

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
      ? ['Fail to compose, "never" does not fit in', FirstBParameter]
      : Awaited<OA> extends FirstBParameter
      ? Internal.EveryElementTakes<PB, undefined> extends true
        ? PipeArguments<restA, [...Arguments, Composable<(...a: PA) => OA>]>
        : Internal.EveryElementTakes<PB, undefined>
      : ['Fail to compose', Awaited<OA>, 'does not fit in', FirstBParameter]
    : [...Arguments, Composable<(...a: PA) => OA>]
  : never

type AllArguments<
  Fns extends any[],
  OriginalFns extends any[] = Fns,
> = Fns extends [Composable<(...a: infer PA) => any>, ...infer restA]
  ? restA extends [Composable<(...b: infer PB) => infer OB>, ...infer restB]
    ? Internal.SubtypesTuple<PA, PB> extends [...infer MergedP]
      ? AllArguments<
          [Composable<(...args: MergedP) => OB>, ...restB],
          OriginalFns
        >
      : ['Fail to compose', PA, 'does not fit in', PB]
    : ApplyArgumentsToFns<OriginalFns, PA>
  : never

type ApplyArgumentsToFns<
  Fns extends any[],
  Args extends any[],
  Output extends any[] = [],
> = Fns extends [(...a: any[]) => infer OA, ...infer restA]
  ? ApplyArgumentsToFns<restA, Args, [...Output, (...a: Args) => OA]>
  : Output

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

type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L]
  ? L
  : never

export type {
  AllArguments,
  Composable,
  Failure,
  Last,
  MergeObjs,
  ParserSchema,
  PipeArguments,
  PipeReturn,
  RecordToTuple,
  Result,
  SerializableError,
  SerializedResult,
  Success,
  UnpackAll,
  UnpackData,
}
