// deno-lint-ignore-file no-namespace ban-ts-comment
import { applySchema } from '../index.ts'
import { assertEquals, describe, it } from './prelude.ts'
import type * as Root from '../index.ts'
import type * as Subject from '../types.ts'
import type * as ContextSubject from '../context/types.ts'

namespace MergeObjects {
  const obj1 = { a: 1, b: 2 } as const
  const obj2 = {}
  const obj3 = { c: 3, d: 4 } as const

  type Result = Subject.MergeObjects<[typeof obj1, typeof obj2, typeof obj3]>

  type test1 = Expect<Equal<keyof Result, 'a' | 'b' | 'c' | 'd'>>
  type test2 = Expect<Equal<Result[keyof Result], 1 | 2 | 3 | 4>>
}

namespace Last {
  type test1 = Expect<Equal<Subject.Last<[1, 2, 3]>, 3>>
  type test2 = Expect<Equal<Subject.Last<[1]>, 1>>
  type test3 = Expect<Equal<Subject.Last<[]>, never>>
}

namespace MergeObjects {
  const obj1 = { a: 1, b: 2 } as const
  const obj2 = {}
  const obj3 = { c: 3, d: 4 } as const

  type Result = Subject.MergeObjects<[typeof obj1, typeof obj2, typeof obj3]>

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
      Subject.FailToCompose<undefined, string>
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
      Subject.FailToCompose<void, number>
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
      Subject.FailToCompose<string, boolean>
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
      Subject.FailToCompose<[x: string, y: string], [x: 'foo', y: number]>
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
      Subject.FailToCompose<number, string>
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
      Subject.FailToCompose<number, string>
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
      Subject.FailToCompose<number, never>
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
    Equal<Subject.UnpackData<Subject.Composable<() => string>>, string>
  >

  const result = applySchema()(() => ({ name: 'foo' } as const))

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

namespace UnionToTuple {
  type WithStringUnion = Expect<
    Equal<Subject.UnionToTuple<'a' | 'b'>, ['a', 'b']>
  >

  type WithStringAndNumber = Expect<
    Equal<Subject.UnionToTuple<'a' | 1>, ['a', 1]>
  >

  type WithRecords = Expect<
    Equal<
      Subject.UnionToTuple<{ a: boolean } | { b?: { name: string } }>,
      [{ a: boolean }, { b?: { name: string } }]
    >
  >

  type WithFunctions = Expect<
    Equal<
      Subject.UnionToTuple<((a: boolean) => void) | (() => Promise<number>)>,
      [(a: boolean) => void, () => Promise<number>]
    >
  >
}

namespace RecordValuesFromKeysTuple {
  type WithEmpty = Expect<Equal<Subject.RecordValuesFromKeysTuple<{}, []>, []>>
  type WithSingle = Expect<
    Equal<Subject.RecordValuesFromKeysTuple<{ a: 1; b: 2 }, ['a']>, [1]>
  >
  type WithMultiple = Expect<
    Equal<
      Subject.RecordValuesFromKeysTuple<{ a: 1; b: 2 }, ['a', 'b']>,
      [1, 2]
    >
  >
}

namespace AnyFn {
  type testAcceptsAnyFunction = Expect<
    Equal<Subject.AnyFn, (...args: any[]) => any>
  >
}

namespace Composables {
  type testWrapsArrayOfFunctions = Expect<
    Equal<
      Subject.Composables<[() => 1, (a: string) => 2]>,
      [Subject.Composable<() => 1>, Subject.Composable<(a: string) => 2>]
    >
  >
  type testWrapsRecordOfFunctions = Expect<
    Equal<
      Subject.Composables<{ a: () => 1 }>,
      { a: Subject.Composable<() => 1> }
    >
  >
}

namespace PublicExports {
  type testAnyFn = Expect<Equal<Root.AnyFn, Subject.AnyFn>>
  type testComposables = Expect<
    Equal<Root.Composables<[() => 1]>, Subject.Composables<[() => 1]>>
  >
  type testUnionToTuple = Expect<
    Equal<Root.UnionToTuple<'a' | 'b'>, Subject.UnionToTuple<'a' | 'b'>>
  >
  type testRecordValuesFromKeysTuple = Expect<
    Equal<
      Root.RecordValuesFromKeysTuple<{ a: 1 }, ['a']>,
      Subject.RecordValuesFromKeysTuple<{ a: 1 }, ['a']>
    >
  >
  type testContextPipeReturn = Expect<
    Equal<
      Root.withContext.PipeReturn<[Subject.Composable<() => 1>]>,
      ContextSubject.PipeReturn<[Subject.Composable<() => 1>]>
    >
  >
  type testContextSequenceReturn = Expect<
    Equal<
      Root.withContext.SequenceReturn<[Subject.Composable<() => 1>]>,
      ContextSubject.SequenceReturn<[Subject.Composable<() => 1>]>
    >
  >
  type testFailToCompose = Expect<
    Equal<Root.FailToCompose<1, 2>, Subject.FailToCompose<1, 2>>
  >
  type testIncompatibleArguments = Expect<
    Equal<Root.IncompatibleArguments, Subject.IncompatibleArguments>
  >
  type testContextBranchReturn = Expect<
    Equal<
      Root.withContext.BranchReturn<Subject.Composable<() => 1>, () => null>,
      ContextSubject.BranchReturn<Subject.Composable<() => 1>, () => null>
    >
  >
  type testContextSetContext = Expect<
    Equal<
      Root.withContext.SetContext<[string], [number]>,
      ContextSubject.SetContext<[string], [number]>
    >
  >
}

describe('type tests', () =>
  it('should have no ts errors', () => assertEquals(true, true)))
