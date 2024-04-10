import { Prettify, Result } from '../types.ts'

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

type UnpackResult<T> = Awaited<T> extends Result<infer R> ? R : never

type UnpackAll<List extends Composable[]> = {
  [K in keyof List]: UnpackResult<ReturnType<List[K]>>
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
      : { 'Incompatible arguments ': true; argument1: headA; argument2: headB }
    : SubtypesTuple<restA, [], [...O, headA]>
  : TB extends [infer headBNoA, ...infer restBNoA]
  ? SubtypesTuple<[], restBNoA, [...O, headBNoA]>
  : O

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

type CollectArguments<T extends Record<string, Composable>> = {} extends Zip<
  Keys<T>,
  AllArguments<RecordValuesFromKeysTuple<T, Keys<T>>>
>
  ? never
  : Prettify<Zip<Keys<T>, AllArguments<RecordValuesFromKeysTuple<T, Keys<T>>>>>

type RecordToTuple<T extends Record<string, Composable>> =
  RecordValuesFromKeysTuple<T, Keys<T>>

export type {
  AllArguments,
  CollectArguments,
  Composable,
  First,
  Fn,
  PipeArguments,
  PipeReturn,
  RecordToTuple,
  Result,
  UnpackAll,
  UnpackResult,
}
