// deno-lint-ignore-file no-namespace ban-ts-comment
import { withSchema } from '../index.ts'
import { assertEquals, describe, it } from './prelude.ts'
import * as Subject from '../types.ts'
import { Internal } from '../internal/types.ts'

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

namespace PipeReturn {
  type test = Expect<
    Equal<
      Subject.PipeReturn<
        [
          Subject.Composable<(a?: unknown, e?: unknown) => { id: number }>,
          Subject.Composable<(a?: unknown, e?: unknown) => number>,
        ]
      >,
      Subject.Composable<(a?: unknown, b?: unknown) => number>
    >
  >
}

namespace CanComposeInSequence {
  type testNoEmptyArgumentList = Expect<
    Equal<Subject.CanComposeInSequence<[]>, never>
  >
  type testOneComposable = Expect<
    Equal<
      Subject.CanComposeInSequence<[Subject.Composable]>,
      [Subject.Composable]
    >
  >
  type testForTwoComposables = Expect<
    Equal<
      Subject.CanComposeInSequence<
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
      Subject.CanComposeInSequence<
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
      Subject.CanComposeInSequence<
        [
          Subject.Composable<(x: string) => number>,
          Subject.Composable<(y: number, willBeUndefined: string) => boolean>,
        ]
      >,
      Internal.FailToCompose<undefined, string>
    >
  >
  type testFailureToCompose = Expect<
    Equal<
      Subject.CanComposeInSequence<
        [
          Subject.Composable<(x: string) => void>,
          Subject.Composable<(y: number) => boolean>,
        ]
      >,
      Internal.FailToCompose<void, number>
    >
  >
  type testFailureToComposeOnThirdElement = Expect<
    Equal<
      Subject.CanComposeInSequence<
        [
          Subject.Composable<(x: string) => number>,
          Subject.Composable<(y: number) => string>,
          Subject.Composable<(z: boolean) => void>,
        ]
      >,
      Internal.FailToCompose<string, boolean>
    >
  >
}

namespace CanComposeInParallel {
  type testNoEmptyArgumentList = Expect<
    Equal<Subject.CanComposeInParallel<[]>, never>
  >
  type testOneComposable = Expect<
    Equal<
      Subject.CanComposeInParallel<[Subject.Composable]>,
      [Subject.Composable]
    >
  >
  type testSubtypesForTwoComposables = Expect<
    Equal<
      Subject.CanComposeInParallel<
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
      Subject.CanComposeInParallel<
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
      Subject.CanComposeInParallel<
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
      Subject.CanComposeInParallel<
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
      Subject.CanComposeInParallel<
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
      Subject.CanComposeInParallel<
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
      Subject.CanComposeInParallel<
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
      Subject.CanComposeInParallel<
        [
          Subject.Composable<(x: string, y: string) => void>,
          Subject.Composable<(x: 'foo', y: number) => void>,
        ]
      >,
      Internal.FailToCompose<[x: string, y: string], [x: 'foo', y: number]>
    >
  >
}

namespace BranchReturn {
  type resolverNotReturningComposable = Expect<
    Equal<
      Subject.BranchReturn<Subject.Composable<() => number>, () => null>,
      Subject.Composable<() => number>
    >
  >
  type resolverWithParamsThatDontCompose = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => number>,
        (i: string) => null
      >,
      Internal.FailToCompose<number, string>
    >
  >
  type resolverWithParamsThatCompose = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => number>,
        (i: number) => null
      >,
      Subject.Composable<() => number>
    >
  >
  type resolverWithPromise = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => number>,
        (i: number) => Promise<null>
      >,
      Subject.Composable<() => number>
    >
  >

  type returningComposableDoesntMatch = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => number>,
        (i: number) => Subject.Composable<(i: string) => number>
      >,
      Internal.FailToCompose<number, string>
    >
  >

  type returningComposableUnionDoesntMatch = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => number>,
        (
          i: number,
        ) =>
          | Subject.Composable<(i: string) => number>
          | Subject.Composable<(i: number) => boolean>
      >,
      Internal.FailToCompose<number, never>
    >
  >

  type resolverUnionMatches = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => { s: string; n: number }>,
        (i: {
          n: number
        }) =>
          | Subject.Composable<(i: { s: string }) => number>
          | Subject.Composable<(i: { n: number }) => boolean>
      >,
      Subject.Composable<() => number | boolean>
    >
  >
  type resolverMatches = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => number>,
        (
          i: number,
        ) =>
          | Subject.Composable<(i: number) => number>
          | Subject.Composable<(i: number) => boolean>
      >,
      Subject.Composable<() => number | boolean>
    >
  >

  // Resolver is async
  type asyncResolver = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<(i: string) => number>,
        (
          i: number,
        ) => Promise<
          | Subject.Composable<(i: number) => number>
          | Subject.Composable<(i: number) => boolean>
        >
      >,
      Subject.Composable<(i: string) => number | boolean>
    >
  >

  type resolverMayBeNull = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => number>,
        (i: number) => Subject.Composable<(i: number) => boolean> | null
      >,
      Subject.Composable<() => number | boolean>
    >
  >
  type asyncResolverMayBeNull = Expect<
    Equal<
      Subject.BranchReturn<
        Subject.Composable<() => number>,
        (
          i: number,
        ) => Promise<Subject.Composable<(i: number) => boolean> | null>
      >,
      Subject.Composable<() => number | boolean>
    >
  >
}

namespace UnpackData {
  type testExtractsDataFromPromisedResult = Expect<
    Equal<Subject.UnpackData<() => Promise<Subject.Result<string>>>, string>
  >

  const result = withSchema()(() => ({ name: 'foo' }) as const)

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
