// deno-lint-ignore-file no-namespace

import { Composable } from '../types.ts'

namespace Internal {
  export type IncompatibleArguments = {
    'Incompatible arguments ': true
  }

  export type IsIncompatible<A, B> = Internal.CommonSubType<
    A,
    B
  > extends IncompatibleArguments
    ? true
    : false

  export type FailToCompose<A, B> = IncompatibleArguments & {
    argument1: A
    argument2: B
  }

  export type Prettify<T> = {
    [K in keyof T]: T[K]
  } & {}

  export type IsNever<A> =
    // prettier-ignore
    (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends never ? 1 : 2)
      ? true
      : false

  export type ApplyArgumentsToFns<
    Fns extends unknown[],
    Args extends unknown[],
    Output extends Composable[] = [],
  > = Fns extends [Composable<(...a: any[]) => infer OA>, ...infer restA]
    ? ApplyArgumentsToFns<
      restA,
      Args,
      [...Output, Composable<(...a: Args) => OA>]
    >
    : Output

  // Thanks to https://github.com/tjjfvi
  // UnionToTuple code lifted from this thread: https://github.com/microsoft/TypeScript/issues/13298#issuecomment-707364842
  // This will not preserve union order but we don't care since this is for Composable paralel application
  export type UnionToTuple<T> = (
    (T extends any ? (t: T) => T : never) extends infer U
      ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any
        ? V
        : never
      : never
  ) extends (_: any) => infer W
    ? [...UnionToTuple<Exclude<T, W>>, W]
    : []

  export type Keys<R extends Record<string, any>> = UnionToTuple<keyof R>

  export type RecordValuesFromKeysTuple<
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

  export type Zip<
    K extends unknown[],
    V extends unknown[],
    O extends Record<string, unknown> = {},
  > = K extends [infer HeadK, ...infer restK]
    ? V extends [infer HeadV, ...infer restV]
      ? HeadK extends string
        ? restK extends string[]
          ? restV extends unknown[]
            ? Prettify<Zip<restK, restV, O & { [key in HeadK]: HeadV }>>
            : V // in this case V has the CanComposeInParallel failure type
          : never
        : never
      : never
    : O

  export type EveryElementTakes<T extends any[], U> = T extends [
    infer HEAD,
    ...infer TAIL,
  ]
    ? U extends HEAD
      ? EveryElementTakes<TAIL, U>
      : FailToCompose<undefined, HEAD>
    : true

  export type SubtypesTuple<
    TupleA extends unknown[],
    TupleB extends unknown[],
    Output extends unknown[] = [],
  > = TupleA extends []
    ? [...Output, ...TupleB]
    : TupleB extends []
    ? [...Output, ...TupleA]
    : TupleA extends [infer headA, ...infer restA]
    ? TupleB extends [infer headB, ...infer restB]
      ? IsIncompatible<headA, headB> extends true
        ? FailToCompose<headA, headB>
        : SubtypesTuple<restA, restB, [...Output, CommonSubType<headA, headB>]>
      : // TupleB is partial
      // We should handle partial case before recursion
      TupleB extends Partial<[infer headPartial, ...infer restPartial]>
      ? IsIncompatible<headA, headPartial> extends true
        ? FailToCompose<headA, headPartial>
        : SubtypesTuple<
            restA,
            Partial<restPartial>,
            [...Output, CommonSubType<headA, Partial<headPartial>>]
          >
      : never
    : TupleB extends [infer headBNoA, ...infer restB]
    ? // TupleA is partial
      // We should handle partial case before recursion
      TupleA extends Partial<[infer headPartial, ...infer restPartial]>
      ? IsIncompatible<headBNoA, headPartial> extends true
        ? FailToCompose<headBNoA, headPartial>
        : SubtypesTuple<
            restB,
            Partial<restPartial>,
            [...Output, CommonSubType<headBNoA, Partial<headPartial>>]
          >
      : never
    : /*
     * We should continue the recursion checking optional parameters
     * We can pattern match optionals using Partial
     * We should start handling partials as soon one side of mandatory ends
     * Remove ...TupleA, ...TupleB bellow
     */
    TupleA extends Partial<[infer headAPartial, ...infer restAPartial]>
    ? TupleB extends Partial<[infer headBPartial, ...infer restBPartial]>
      ? IsIncompatible<headAPartial, headBPartial> extends true
        ? SubtypesTuple<
            Partial<restAPartial>,
            Partial<restBPartial>,
            [...Output, ...Partial<[undefined]>]
          >
        : SubtypesTuple<
            Partial<restAPartial>,
            Partial<restBPartial>,
            [...Output, ...Partial<[CommonSubType<headAPartial, headBPartial>]>]
          >
      : never
    : never

  export type CommonSubType<A, B> = [A] extends [B]
    ? A
    : [B] extends [A]
    ? B
    : A extends { 'Incompatible arguments ': true }
    ? A
    : B extends { 'Incompatible arguments ': true }
    ? B
    : A extends Record<PropertyKey, unknown>
    ? B extends Record<PropertyKey, unknown>
      ? Prettify<A & B>
      : FailToCompose<A, B>
    : FailToCompose<A, B>
}

export type { Internal }
