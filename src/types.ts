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
  ? MergeObjs<rest, Prettify<Omit<output, keyof first> & first>>
  : output

type Prettify<T> = {
  [K in keyof T]: T[K]
  // deno-lint-ignore ban-types
} & {}

/**
 * It is similar to Partial<T> but it requires at least one property to be defined.
 * @example
 * type MyType = AtLeastOne<{ a: string, b: number }>
 * const a: MyType = { a: 'hello' }
 * const b: MyType = { b: 123 }
 * const c: MyType = { a: 'hello', b: 123 }
 * // The following won't compile:
 * const d: MyType = {}
 */
type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

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

/**
 * Converts a tuple type to a union type.
 * @example
 * type MyTuple = [string, number]
 * type MyUnion = TupleToUnion<MyTuple>
 * //   ^? string | number
 */
type TupleToUnion<T extends unknown[]> = T[number]

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

type UnpackData<T> = Awaited<T> extends Result<infer R> ? R : never

type UnpackAll<List extends Composable[]> = {
  [K in keyof List]: UnpackData<ReturnType<List[K]>>
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
    ]
    ? IsNever<Awaited<OA>> extends true
      ? ['Fail to compose, "never" does not fit in', FirstBParameter]
      : Awaited<OA> extends FirstBParameter
        ? EveryElementTakesUndefined<PB> extends true
          ? PipeArguments<restA, [...Arguments, Composable<(...a: PA) => OA>]>
          : EveryElementTakesUndefined<PB>
        : ['Fail to compose', Awaited<OA>, 'does not fit in', FirstBParameter]
    : [...Arguments, Composable<(...a: PA) => OA>]
  : never

type EveryElementTakesUndefined<T extends any[]> = T extends [
  infer HEAD,
  ...infer TAIL,
]
  ? undefined extends HEAD
    ? true & EveryElementTakesUndefined<TAIL>
    : ['Fail to compose', undefined, 'does not fit in', HEAD]
  : true

type SubtypesTuple<
  TA extends unknown[],
  TB extends unknown[],
  O extends unknown[],
> = TA extends [infer headA, ...infer restA]
  ? TB extends [infer headB, ...infer restB]
    ? headA extends headB
      ? SubtypesTuple<restA, restB, [...O, headA]>
      : headB extends headA
        ? SubtypesTuple<restA, restB, [...O, headB]>
        : {
            'Incompatible arguments ': true
            argument1: headA
            argument2: headB
          }
    : // TB is empty (or partial)
      // We should go down a SubtypesPartialTuple
      SubtypesTuple<restA, [], [...O, headA]>
  : TB extends [infer headBNoA, ...infer restB]
    ? // TA is empty (or partial)
      // We should go down a SubtypesPartialTuple
      SubtypesTuple<[], restB, [...O, headBNoA]>
    : /*
       * We should continue the recursion checking optional parameters
       * We can pattern match optionals using Partial
       * We should start handling partials as soon one side of mandatory ends
       * Remove ...TA, ...TB bellow
       */
      O

type WithBothOptional = SubtypesTuple<
  Parameters<(a: string, b?: number) => void>,
  Parameters<(a: string, b?: number) => void>,
  []
>
type WithOptionalOnSecond = SubtypesTuple<
  Parameters<(a: unknown) => void>,
  Parameters<(a: number, b?: number) => void>,
  []
>
type WithOptionalOnFirst = SubtypesTuple<
  Parameters<(a: unknown, b?: number) => void>,
  Parameters<(a: number) => void>,
  []
>
type WithMultipleOptionals = SubtypesTuple<
  Parameters<(a: unknown, b?: number, c?: boolean) => void>,
  Parameters<(a: number, b?: 1) => void>,
  []
>
type WithConflictingOptionals = SubtypesTuple<
  Parameters<(a: unknown, b?: number) => void>,
  Parameters<(a: number, b: string) => void>,
  []
>

// Current pass
type AllMandatory = SubtypesTuple<
  Parameters<(a: string, b: number) => void>,
  Parameters<(a: string, b: number) => void>,
  []
>
type WithOptional = SubtypesTuple<
  Parameters<(a: string, b?: number) => void>,
  Parameters<(a: string, b: number) => void>,
  []
>
type WithOptional2 = SubtypesTuple<
  Parameters<(a: string, b: number) => void>,
  Parameters<(a: string, b?: number) => void>,
  []
>
type SubtypesWithAPartialTuple<
  MandatoryTuple extends unknown[],
  PartialTuble extends unknown[],
  O extends unknown[],
> = MandatoryTuple extends [infer head, ...infer rest]
  ? PartialTuble extends Partial<[infer headPartial, ...infer restPartial]>
    ? head extends headPartial
      ? SubtypesWithAPartialTuple<rest, Partial<restPartial>, [...O, head]>
      : headPartial extends head
        ? SubtypesWithAPartialTuple<
            rest,
            Partial<restPartial>,
            [...O, headPartial]
          >
        : {
            'Incompatible arguments ': true
            argument1: head
            argument2: headPartial
          }
    : // Partial is empty
      // so I need the mandatory parameters list
      [...O, ...MandatoryTuple]
  : PartialTuble extends Partial<[...infer restPartial]>
    ? // Mandatory is empty (or partial)
      // We should go down a SubtypesPartialPartialTuple
      MandatoryTuple extends Partial<[...infer restMandatory]>
      ? SubtypesTuple<restMandatory, restPartial, []> extends []
        ? O
        : [...O, Partial<SubtypesTuple<restMandatory, restPartial, []>>]
      : never
    : /*
       * We should continue the recursion checking optional parameters
       * We can pattern match optionals using Partial
       * We should start handling partials as soon one side of mandatory ends
       * Remove ...TA, ...TB bellow
       */
      never

type PartialTestSubtype = SubtypesWithAPartialTuple<
  Parameters<(b: number) => void>,
  Parameters<(b?: 1) => void>,
  []
>
type PartialTestConflict = SubtypesWithAPartialTuple<
  Parameters<(b: string) => void>,
  Parameters<(b?: 1) => void>,
  []
>
type PartialTestLongerPartial = SubtypesWithAPartialTuple<
  Parameters<(b: number) => void>,
  Parameters<(b?: 1, c?: string) => void>,
  []
>
type PartialTestLongerMandatory = SubtypesWithAPartialTuple<
  Parameters<(b: number, c: string) => void>,
  Parameters<(b?: 1) => void>,
  []
>
type PartialTestLongerMandatoryPlusPartial = SubtypesWithAPartialTuple<
  Parameters<(b: number, c: string, d?: string) => void>,
  Parameters<(b?: 1) => void>,
  []
>

type AllArguments<
  Fns extends any[],
  Arguments extends any[] = [],
> = Fns extends [Composable<(...a: infer PA) => infer OA>, ...infer restA]
  ? restA extends [Composable<(...b: infer PB) => infer OB>, ...infer restB]
    ? SubtypesTuple<PA, PB, []> extends [...infer MergedP]
      ? AllArguments<
          [Composable<(...args: MergedP) => OB>, ...restB],
          [...Arguments, Composable<(...a: MergedP) => OA>]
        >
      : ['Fail to compose', PA, 'does not fit in', PB]
    : [...Arguments, Composable<(...a: PA) => OA>]
  : never

// Thanks to https://github.com/tjjfvi
// UnionToTuple code lifted from this thread: https://github.com/microsoft/TypeScript/issues/13298#issuecomment-707364842
// This will not preserve union order but we don't care since this is for Composable paralel application
type UnionToTuple<T> = (
  (T extends any ? (t: T) => T : never) extends infer U
    ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any
      ? V
      : never
    : never
) extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : []

type Keys<R extends Record<string, any>> = UnionToTuple<keyof R>

type RecordValuesFromKeysTuple<
  R extends Record<string, Composable>,
  K extends unknown[],
  ValuesTuple extends Composable[] = [],
> = K extends [infer Head, ...infer rest]
  ? Head extends string
    ? rest extends string[]
      ? RecordValuesFromKeysTuple<R, rest, [...ValuesTuple, R[Head]]>
      : never
    : ValuesTuple
  : ValuesTuple

type Zip<
  K extends unknown[],
  V extends Composable[],
  O extends Record<string, Composable> = {},
> = K extends [infer HeadK, ...infer restK]
  ? V extends [infer HeadV, ...infer restV]
    ? HeadK extends string
      ? restK extends string[]
        ? restV extends Composable[]
          ? Zip<restK, restV, O & { [key in HeadK]: HeadV }>
          : V // in this case V has the AllArguments failure type
        : never
      : never
    : O
  : O

type CollectArguments<T extends Record<string, Composable>> =
  {} extends Zip<Keys<T>, AllArguments<RecordValuesFromKeysTuple<T, Keys<T>>>>
    ? never
    : Prettify<
        Zip<Keys<T>, AllArguments<RecordValuesFromKeysTuple<T, Keys<T>>>>
      >

type RecordToTuple<T extends Record<string, Composable>> =
  RecordValuesFromKeysTuple<T, Keys<T>>

type SerializableError<T extends Error = Error> = {
  exception: T
  message: string
  name: string
  path: string[]
}

type SerializedResult<T> =
  | Success<T>
  | { success: false; errors: SerializableError[] }

export type {
  AllArguments,
  AtLeastOne,
  CollectArguments,
  Composable,
  Failure,
  First,
  Fn,
  Last,
  MergeObjs,
  PipeArguments,
  PipeReturn,
  Prettify,
  RecordToTuple,
  Result,
  SerializableError,
  SerializedResult,
  Success,
  TupleToUnion,
  UnpackAll,
  UnpackData,
}
