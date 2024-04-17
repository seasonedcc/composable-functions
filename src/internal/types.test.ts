// deno-lint-ignore-file no-namespace
import { assertEquals, describe, it } from '../test-prelude.ts'
import { Internal } from './types.ts'

namespace UnionToTuple {
  type WithStringUnion = Expect<
    Equal<Internal.UnionToTuple<'a' | 'b'>, ['a', 'b']>
  >

  type WithStringAndNumber = Expect<
    Equal<Internal.UnionToTuple<'a' | 1>, ['a', 1]>
  >

  type WithRecords = Expect<
    Equal<
      Internal.UnionToTuple<{ a: boolean } | { b?: { name: string } }>,
      [{ a: boolean }, { b?: { name: string } }]
    >
  >

  type WithFunctions = Expect<
    Equal<
      Internal.UnionToTuple<((a: boolean) => void) | (() => Promise<number>)>,
      [(a: boolean) => void, () => Promise<number>]
    >
  >
}

namespace CommonSubType {
  type WithNoCompatibility = Expect<
    Equal<
      Internal.CommonSubType<number, string>,
      { 'Incompatible arguments ': true; argument1: number; argument2: string }
    >
  >

  type WithSameType = Expect<
    Equal<Internal.CommonSubType<number, number>, number>
  >

  type WithNarrowerFirst = Expect<Equal<Internal.CommonSubType<1, number>, 1>>
  type WithNarrowerLast = Expect<Equal<Internal.CommonSubType<number, 1>, 1>>

  type WithArrays = Expect<
    Equal<Internal.CommonSubType<unknown[], string[]>, string[]>
  >
  type WithTuplesAndArrays = Expect<
    Equal<Internal.CommonSubType<['foo'], string[]>, ['foo']>
  >
  type WithUnions = Expect<Equal<Internal.CommonSubType<1 | 2, 1>, 1>>
  type WithPartial = Expect<
    Equal<Internal.CommonSubType<string | undefined, string>, string>
  >
}

namespace SubtypesTuple {
  type WithOnlyUdnefinedAsCommonSubtype = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: string, b?: number) => void>,
        Parameters<(a: string, b?: string) => void>,
        []
      >,
      [string, undefined?]
    >
  >

  type WithBothOptional = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: string, b?: number) => void>,
        Parameters<(a: string, b?: number) => void>,
        []
      >,
      [string, (number | undefined)?]
    >
  >

  type WithMultipleOptionals = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: unknown, b?: number, c?: boolean) => void>,
        Parameters<(a: number, b?: 1) => void>,
        []
      >,
      [number, (1 | undefined)?, (boolean | undefined)?]
    >
  >

  type WithConflictingOptionals = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: unknown, b?: number) => void>,
        Parameters<(a: number, b: string) => void>,
        []
      >,
      {
        'Incompatible arguments ': true
        argument1: string
        argument2: number
      }
    >
  >

  type WithOptionalOnSecond = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: unknown) => void>,
        Parameters<(a: number, b?: number) => void>,
        []
      >,
      [number, (number | undefined)?]
    >
  >

  type WithOptionalOnFirst = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: unknown, b?: number) => void>,
        Parameters<(a: number) => void>,
        []
      >,
      [number, (number | undefined)?]
    >
  >

  type AllMandatory = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: string, b: 1) => void>,
        Parameters<(a: 'foo', b: number) => void>,
        []
      >,
      ['foo', 1]
    >
  >

  type WithOptional = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: string, b?: number) => void>,
        Parameters<(a: string, b: number) => void>,
        []
      >,
      [string, number]
    >
  >

  type WithOptional2 = Expect<
    Equal<
      Internal.SubtypesTuple<
        Parameters<(a: string, b: number) => void>,
        Parameters<(a: string, b?: number) => void>,
        []
      >,
      [string, number]
    >
  >
}

namespace EveryElementTakesUndefined {
  type WithAllUndefined = Expect<
    Equal<Internal.EveryElementTakesUndefined<[undefined, undefined]>, true>
  >

  type WithSomeDefined = Expect<
    Equal<
      Internal.EveryElementTakesUndefined<[undefined, 'foo', undefined]>,
      ['Fail to compose', undefined, 'does not fit in', 'foo']
    >
  >
}

describe('type tests', () =>
  it('should have no ts errors', () => assertEquals(true, true)))
