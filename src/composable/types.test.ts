// deno-lint-ignore-file ban-ts-comment no-namespace no-unused-vars
import { assertEquals, describe, it } from '../test-prelude.ts'
import * as Subject from './types.ts'

export type Expect<T extends true> = T
export type Equal<A, B> =
  // prettier is removing the parens thus worsening readability
  // prettier-ignore
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true
    : [A, "should equal", B]

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

namespace UnpackResult {
  type testExtractsDataFromPromisedResult = Expect<
    Equal<Subject.UnpackResult<Promise<Subject.Result<string>>>, string>
  >
}

namespace UnpackAll {
  type testExtractsDataFromPromisedResult = Expect<
    Equal<Subject.UnpackAll<[Subject.Composable<() => string>]>, [string]>
  >
}

describe('type tests', () =>
  it('should have no ts errors', () => assertEquals(true, true)))
