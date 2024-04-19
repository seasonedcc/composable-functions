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

/**
 * Returns the last item of a tuple type.
 * @example
 * type MyTuple = [string, number]
 * type Result = Last<MyTuple>
 * //   ^? number
 */
type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L]
  ? L
  : never

type IsNever<A> =
  // prettier is removing the parens thus worsening readability
  // prettier-ignore
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends never ? 1 : 2)
    ? true
    : false

type First<T extends readonly any[]> = T extends [infer F, ...infer _I]
  ? F
  : never

type Fn = (...args: any[]) => any
type Composable<T extends Fn = Fn> = (
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
  ? IsNever<OA> extends true
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
    ? IsNever<Awaited<OA>> extends true
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
  Arguments extends any[] = [],
> = Fns extends [Composable<(...a: infer PA) => infer OA>, ...infer restA]
  ? restA extends [Composable<(...b: infer PB) => infer OB>, ...infer restB]
    ? Internal.SubtypesTuple<PA, PB, []> extends [...infer MergedP]
      ? AllArguments<
          [Composable<(...args: MergedP) => OB>, ...restB],
          [...Arguments, Composable<(...a: MergedP) => OA>]
        >
      : ['Fail to compose', PA, 'does not fit in', PB]
    : [...Arguments, Composable<(...a: PA) => OA>]
  : never

type CollectArguments<T extends Record<string, Composable>> =
  {} extends Internal.Zip<
    Internal.Keys<T>,
    AllArguments<Internal.RecordValuesFromKeysTuple<T, Internal.Keys<T>>>
  >
    ? never
    : AllArguments<
        Internal.RecordValuesFromKeysTuple<T, Internal.Keys<T>>
      > extends ['Fail to compose', ...any[]]
    ? AllArguments<Internal.RecordValuesFromKeysTuple<T, Internal.Keys<T>>>
    : Internal.Zip<
        Internal.Keys<T>,
        AllArguments<Internal.RecordValuesFromKeysTuple<T, Internal.Keys<T>>>
      >

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
 * A parsing error when validating the input or environment schemas.
 * This will be transformed into an `InputError` before being returned from the domain function.
 * It is usually not visible to the end user unless one wants to write an adapter for a schema validator.
 */
type ParserIssue = { path: PropertyKey[]; message: string }

/**
 * The result of input or environment validation.
 * See the type `Result` for the return values of domain functions.
 * It is usually not visible to the end user unless one wants to write an adapter for a schema validator.
 */
type ParserResult<T> =
  | {
      success: true
      data: T
    }
  | { success: false; error: { issues: ParserIssue[] } }

/**
 * The object used to validate either input or environment when creating domain functions.
 */
type ParserSchema<T extends unknown = unknown> = {
  safeParseAsync: (a: unknown) => Promise<ParserResult<T>>
}

export type {
  AllArguments,
  CollectArguments,
  Composable,
  Failure,
  First,
  Fn,
  Last,
  MergeObjs,
  ParserIssue,
  ParserResult,
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
