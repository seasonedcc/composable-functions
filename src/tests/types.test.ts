// deno-lint-ignore-file no-namespace ban-ts-comment
import { withSchema } from '../index.ts'
import { assertEquals, describe, it } from './prelude.ts'
import * as Subject from '../types.ts'

namespace MergeObjs {
  const obj1 = { a: 1, b: 2 } as const
  const obj2 = {}
  const obj3 = { c: 3, d: 4 } as const

  type Result = Subject.MergeObjs<[typeof obj1, typeof obj2, typeof obj3]>

  type test1 = Expect<Equal<keyof Result, 'a' | 'b' | 'c' | 'd'>>
  type test2 = Expect<Equal<Result[keyof Result], 1 | 2 | 3 | 4>>
}

namespace Last {
  type test1 = Expect<Equal<Subject.Last<[1, 2, 3]>, 3>>
  type test2 = Expect<Equal<Subject.Last<[1]>, 1>>
  type test3 = Expect<Equal<Subject.Last<[]>, never>>
}

namespace MergeObjs {
  const obj1 = { a: 1, b: 2 } as const
  const obj2 = {}
  const obj3 = { c: 3, d: 4 } as const

  type Result = Subject.MergeObjs<[typeof obj1, typeof obj2, typeof obj3]>

  type test1 = Expect<Equal<keyof Result, 'a' | 'b' | 'c' | 'd'>>
  type test2 = Expect<Equal<Result[keyof Result], 1 | 2 | 3 | 4>>
}

namespace Last {
  type test1 = Expect<Equal<Subject.Last<[1, 2, 3]>, 3>>
  type test2 = Expect<Equal<Subject.Last<[1]>, 1>>
  type test3 = Expect<Equal<Subject.Last<[]>, never>>
}

namespace PipeArguments {
  type testNoEmptyArgumentList = Expect<Equal<Subject.PipeArguments<[]>, never>>
  type testOneComposable = Expect<
    Equal<Subject.PipeArguments<[Subject.Composable]>, [Subject.Composable]>
  >
  type testForTwoComposables = Expect<
    Equal<
      Subject.PipeArguments<
        [
          Subject.Composable<(x: string) => number>,
          Subject.Composable<(y: number) => boolean>,
        ]
      >,
      [
        Subject.Composable<(x: string) => number>,
        Subject.Composable<(y: number) => boolean>,
      ]
    >
  >
  type testForComponentsWithArityGreaterThan1WithOptionalParameters = Expect<
    Equal<
      Subject.PipeArguments<
        [
          Subject.Composable<(x: string) => number>,
          Subject.Composable<(y: number, optionalArgument?: string) => boolean>,
        ]
      >,
      [
        Subject.Composable<(x: string) => number>,
        Subject.Composable<(y: number, optionalArgument?: string) => boolean>,
      ]
    >
  >
  type testForComponentsWithArityGreaterThan1 = Expect<
    Equal<
      Subject.PipeArguments<
        [
          Subject.Composable<(x: string) => number>,
          Subject.Composable<(y: number, willBeUndefined: string) => boolean>,
        ]
      >,
      ['Fail to compose', undefined, 'does not fit in', string]
    >
  >
  type testFailureToCompose = Expect<
    Equal<
      Subject.PipeArguments<
        [
          Subject.Composable<(x: string) => void>,
          Subject.Composable<(y: number) => boolean>,
        ]
      >,
      ['Fail to compose', void, 'does not fit in', number]
    >
  >
  type testFailureToComposeOnThirdElement = Expect<
    Equal<
      Subject.PipeArguments<
        [
          Subject.Composable<(x: string) => number>,
          Subject.Composable<(y: number) => string>,
          Subject.Composable<(z: boolean) => void>,
        ]
      >,
      ['Fail to compose', string, 'does not fit in', boolean]
    >
  >
}

namespace AllArguments {
  type testNoEmptyArgumentList = Expect<Equal<Subject.AllArguments<[]>, never>>
  type testOneComposable = Expect<
    Equal<Subject.AllArguments<[Subject.Composable]>, [Subject.Composable]>
  >
  type testSubtypesForTwoComposables = Expect<
    Equal<
      Subject.AllArguments<
        [
          Subject.Composable<(x: string, y: 1) => void>,
          Subject.Composable<(x: 'foo', y: number) => void>,
        ]
      >,
      [
        Subject.Composable<(x: 'foo', y: 1) => void>,
        Subject.Composable<(x: 'foo', y: 1) => void>,
      ]
    >
  >
  type testSubtypesForThreeComposables = Expect<
    Equal<
      Subject.AllArguments<
        [
          Subject.Composable<(x: unknown) => void>,
          Subject.Composable<(x: string) => void>,
          Subject.Composable<(x: 'foo') => void>,
        ]
      >,
      [
        Subject.Composable<(x: 'foo') => void>,
        Subject.Composable<(x: 'foo') => void>,
        Subject.Composable<(x: 'foo') => void>,
      ]
    >
  >
  type testSubtypesForStricterOptional = Expect<
    Equal<
      Subject.AllArguments<
        [
          Subject.Composable<(x: string, y?: 1) => void>,
          Subject.Composable<(x: 'foo', y: number) => void>,
        ]
      >,
      [
        Subject.Composable<(x: 'foo', y: 1) => void>,
        Subject.Composable<(x: 'foo', y: 1) => void>,
      ]
    >
  >
  type testSubtypesForOptionalsOnBoth = Expect<
    Equal<
      Subject.AllArguments<
        [
          Subject.Composable<(x: string, y?: number) => void>,
          Subject.Composable<(x: 'foo', y?: number) => void>,
        ]
      >,
      [
        Subject.Composable<(x: 'foo', y?: number) => void>,
        Subject.Composable<(x: 'foo', y?: number) => void>,
      ]
    >
  >
  type testSubtypesForConflictingOptionals = Expect<
    Equal<
      Subject.AllArguments<
        [
          Subject.Composable<(x: string, y?: number) => void>,
          Subject.Composable<(x: 'foo', y?: string) => void>,
        ]
      >,
      [
        Subject.Composable<(x: 'foo', y?: undefined) => void>,
        Subject.Composable<(x: 'foo', y?: undefined) => void>,
      ]
    >
  >
  type testMaxArityForTwoComposables = Expect<
    Equal<
      Subject.AllArguments<
        [
          Subject.Composable<(x: string, y: number) => void>,
          Subject.Composable<(x: 'foo') => void>,
        ]
      >,
      [
        Subject.Composable<(x: 'foo', y: number) => void>,
        Subject.Composable<(x: 'foo', y: number) => void>,
      ]
    >
  >
  type testMaxArityForTwoComposablesInverse = Expect<
    Equal<
      Subject.AllArguments<
        [
          Subject.Composable<(x: string) => void>,
          Subject.Composable<(x: 'foo', y: number) => void>,
        ]
      >,
      [
        Subject.Composable<(x: 'foo', y: number) => void>,
        Subject.Composable<(x: 'foo', y: number) => void>,
      ]
    >
  >
  type testCompositionFailure = Expect<
    Equal<
      Subject.AllArguments<
        [
          Subject.Composable<(x: string, y: string) => void>,
          Subject.Composable<(x: 'foo', y: number) => void>,
        ]
      >,
      [
        'Fail to compose',
        [x: string, y: string],
        'does not fit in',
        [x: 'foo', y: number],
      ]
    >
  >
}

namespace CollectArguments {
  type testNoEmptyArgumentList = Expect<
    Equal<Subject.CollectArguments<{}>, never>
  >
  type testOneComposable = Expect<
    Equal<
      Subject.CollectArguments<{ a: Subject.Composable }>,
      { a: Subject.Composable }
    >
  >
  type testSubtypesForTwoComposables = Expect<
    Equal<
      Subject.CollectArguments<{
        a: Subject.Composable<(x: string, y: 1) => void>
        b: Subject.Composable<(x: 'foo', y: number) => void>
      }>,
      {
        a: Subject.Composable<(x: 'foo', y: 1) => void>
        b: Subject.Composable<(x: 'foo', y: 1) => void>
      }
    >
  >
  type testMaxArityForTwoComposables = Expect<
    Equal<
      Subject.CollectArguments<{
        a: Subject.Composable<(x: string, y: number) => void>
        b: Subject.Composable<(x: 'foo') => void>
      }>,
      {
        a: Subject.Composable<(x: 'foo', y: number) => void>
        b: Subject.Composable<(x: 'foo', y: number) => void>
      }
    >
  >

  type testCompositionFailure = Expect<
    Equal<
      Subject.CollectArguments<{
        a: Subject.Composable<(x: string, y: string) => void>
        b: Subject.Composable<(x: 'foo', y: number) => void>
      }>,
      [
        'Fail to compose',
        [x: string, y: string],
        'does not fit in',
        [x: 'foo', y: number],
      ]
    >
  >
}

namespace UnpackData {
  type testExtractsDataFromPromisedResult = Expect<
    Equal<Subject.UnpackData<() => Promise<Subject.Result<string>>>, string>
  >

  const result = withSchema()(() => ({ name: 'foo' } as const))

  type test = Expect<
    Equal<Subject.UnpackData<typeof result>, { readonly name: 'foo' }>
  >
  type error = Expect<
    // @ts-expect-error
    Equal<Subject.UnpackData<typeof result>, { name: string }>
  >
}

namespace UnpackAll {
  type testExtractsDataFromPromisedResult = Expect<
    Equal<Subject.UnpackAll<[Subject.Composable<() => string>]>, [string]>
  >
}

describe('type tests', () =>
  it('should have no ts errors', () => assertEquals(true, true)))
