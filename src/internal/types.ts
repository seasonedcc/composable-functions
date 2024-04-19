// deno-lint-ignore-file no-namespace

namespace Internal {
  export type Prettify<T> = {
    [K in keyof T]: T[K]
    // deno-lint-ignore ban-types
  } & {}

  export type IsNever<A> =
    // prettier is removing the parens thus worsening readability
    // prettier-ignore
    (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends never ? 1 : 2)
    ? true
    : false

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
            : V // in this case V has the AllArguments failure type
          : never
        : never
      : O
    : O

  export type EveryElementTakes<T extends any[], U> = T extends [
    infer HEAD,
    ...infer TAIL,
  ]
    ? U extends HEAD
      ? EveryElementTakes<TAIL, U>
      : ['Fail to compose', undefined, 'does not fit in', HEAD]
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
      ? CommonSubType<headA, headB> extends {
          'Incompatible arguments ': true
        }
        ? CommonSubType<headA, headB>
        : SubtypesTuple<restA, restB, [...Output, CommonSubType<headA, headB>]>
      : // TB is partial
      // We should handle partial case before recursion
      TupleB extends Partial<[infer headPartial, ...infer restPartial]>
      ? CommonSubType<headA, headPartial> extends {
          'Incompatible arguments ': true
        }
        ? CommonSubType<headA, headPartial>
        : SubtypesTuple<
            restA,
            restPartial,
            [...Output, CommonSubType<headA, headPartial>]
          >
      : never
    : TupleB extends [infer headBNoA, ...infer restB]
    ? // TA is partial
      // We should handle partial case before recursion
      TupleA extends Partial<[infer headPartial, ...infer restPartial]>
      ? CommonSubType<headBNoA, headPartial> extends {
          'Incompatible arguments ': true
        }
        ? CommonSubType<headBNoA, headPartial>
        : SubtypesTuple<
            restB,
            restPartial,
            [...Output, CommonSubType<headBNoA, headPartial>]
          >
      : never
    : /*
     * We should continue the recursion checking optional parameters
     * We can pattern match optionals using Partial
     * We should start handling partials as soon one side of mandatory ends
     * Remove ...TA, ...TB bellow
     */
    TupleA extends Partial<[infer headAPartial, ...infer restAPartial]>
    ? TupleB extends Partial<[infer headBPartial, ...infer restBPartial]>
      ? CommonSubType<headAPartial, headBPartial> extends {
          'Incompatible arguments ': true
        }
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
    : A extends Record<PropertyKey, any>
    ? B extends Record<PropertyKey, any>
      ? Prettify<A & B>
      : {
          'Incompatible arguments ': true
          argument1: A
          argument2: B
        }
    : {
        'Incompatible arguments ': true
        argument1: A
        argument2: B
      }
}

export type { Internal }
