// deno-lint-ignore-file no-namespace

import { Internal } from '../../internal/types.ts'
import { Composable } from '../../types.ts'
import * as Subject from '../types.ts'

namespace CommonEnvironment {
  type testNoEmptyArgumentList = Expect<
    Equal<Subject.CommonEnvironment<[]>, [unknown?]>
  >
  type testOneComposable = Expect<
    Equal<Subject.CommonEnvironment<[Composable]>, [any]>
  >
  type testForTwoOptionalUnknowns = Expect<
    Equal<
      Subject.CommonEnvironment<
        [
          Composable<(x: string, env?: unknown) => number>,
          Composable<(y: number, env?: unknown) => boolean>,
        ]
      >,
      [unknown?]
    >
  >
  type testForTwoComposables = Expect<
    Equal<
      Subject.CommonEnvironment<
        [
          Composable<(x: string, env: number) => number>,
          Composable<(y: number, env: 1) => boolean>,
        ]
      >,
      [1]
    >
  >
  type testForComponentsWithArityGreaterThan1WithOptionalParameters = Expect<
    Equal<
      Subject.CommonEnvironment<
        [
          Composable<(x: number) => number>,
          Composable<(y: number, optionalArgument?: string) => boolean>,
        ]
      >,
      [(string | undefined)?]
    >
  >

  type testForComponentsWithArityGreaterThan1 = Expect<
    Equal<
      Subject.CommonEnvironment<
        [
          Composable<(x: string) => number>,
          Composable<(y: number, willBeUndefined: string) => boolean>,
        ]
      >,
      [string]
    >
  >

  type testFailureToCompose = Expect<
    Equal<
      Subject.CommonEnvironment<
        [
          Composable<(x: string, env: number) => void>,
          Composable<(y: number, env: string) => boolean>,
        ]
      >,
      Internal.FailToCompose<[number], [string]>
    >
  >

  type testMultipleOptionalUnknown = Expect<
    Equal<
      Subject.CommonEnvironment<
        [
          Composable<(a?: unknown, e?: unknown) => void>,
          Composable<(a?: unknown, e?: unknown) => void>,
        ]
      >,
      [unknown?]
    >
  >
}

namespace SequenceReturn {
  type test = Expect<
    Equal<
      Subject.SequenceReturn<
        [
          Composable<(a: number, e?: unknown) => number>,
          Composable<(a: number, e: number) => number>,
          Composable<(a: number) => void>,
        ]
      >,
      Composable<(a: number, b: number) => [number, number, void]>
    >
  >

  type test2 = Expect<
    Equal<
      Subject.SequenceReturn<
        [
          Composable<(a?: unknown, e?: unknown) => { id: number }>,
          Composable<(a?: unknown, e?: unknown) => number>,
        ]
      >,
      Composable<(a?: unknown, b?: unknown) => [{ id: number }, number]>
    >
  >
}

namespace PipeReturn {
  type test = Expect<
    Equal<
      Subject.PipeReturn<
        [
          Composable<(a: number, e?: unknown) => number>,
          Composable<(a: number, e: number) => number>,
          Composable<(a: number) => void>,
        ]
      >,
      Composable<(a: number, b: number) => void>
    >
  >

  type test2 = Expect<
    Equal<
      Subject.PipeReturn<
        [
          Composable<(a?: unknown, e?: unknown) => { id: number }>,
          Composable<(a?: unknown, e?: unknown) => number>,
        ]
      >,
      Composable<(a?: unknown, b?: unknown) => number>
    >
  >
}

namespace BranchReturn {
  type testCommonEnv = Expect<
    Equal<
      Subject.BranchReturn<
        Composable<(a: number, e?: unknown) => number>,
        (a: number) => Composable<(a: number, e: number) => string>
      >,
      Composable<(a: number, e: number) => string>
    >
  >
  type test = Expect<
    Equal<
      Subject.BranchReturn<
        Composable<(a?: unknown, e?: unknown) => number>,
        (a: number) => null | Composable<(a?: unknown, e?: unknown) => string>
      >,
      Composable<(a?: unknown, e?: unknown) => string | number>
    >
  >
}

namespace GetEnv {
  type test1 = Expect<
    Equal<
      Subject.GetEnv<Parameters<Composable<(a: number, e: number) => void>>>,
      [number]
    >
  >
  type test2 = Expect<
    Equal<Subject.GetEnv<Parameters<Composable<() => void>>>, [unknown?]>
  >
  type test3 = Expect<
    Equal<
      Subject.GetEnv<Parameters<Composable<(a: number, e?: number) => void>>>,
      [number?]
    >
  >
  type test4 = Expect<
    Equal<
      Subject.GetEnv<Parameters<Composable<(a?: number, e?: number) => void>>>,
      [number?]
    >
  >
  type test5 = Expect<Equal<Subject.GetEnv<Parameters<Composable>>, [any]>>
  type test6 = Expect<
    Equal<
      Subject.GetEnv<
        Parameters<Composable<(a?: unknown, b?: unknown) => void>>
      >,
      [unknown?]
    >
  >
}

namespace SetEnv {
  type test1 = Expect<
    Equal<
      Subject.SetEnv<Parameters<Composable<(a: number) => void>>>,
      [number, unknown?]
    >
  >
  type test2 = Expect<
    Equal<
      Subject.SetEnv<Parameters<Composable<(a: number) => void>>, [number]>,
      [number, number]
    >
  >
  type test3 = Expect<
    Equal<
      Subject.SetEnv<Parameters<Composable<(a?: number) => void>>, [number]>,
      [number | undefined, number]
    >
  >
  type test4 = Expect<
    Equal<
      Subject.SetEnv<Parameters<Composable<() => void>>>,
      [unknown?, unknown?]
    >
  >
  type test5 = Expect<
    Equal<
      Subject.SetEnv<
        Parameters<Composable<(a?: unknown, e?: unknown) => void>>,
        [unknown?]
      >,
      [unknown?, unknown?]
    >
  >
}
