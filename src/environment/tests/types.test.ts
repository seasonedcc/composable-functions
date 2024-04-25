// deno-lint-ignore-file no-namespace

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
      {
        'Incompatible arguments ': true
        argument1: [number]
        argument2: [string]
      }
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

namespace SequenceReturnWithEnvironment {
  type test = Expect<
    Equal<
      Subject.SequenceReturnWithEnvironment<
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
      Subject.SequenceReturnWithEnvironment<
        [
          Composable<(a?: unknown, e?: unknown) => { id: number }>,
          Composable<(a?: unknown, e?: unknown) => number>,
        ]
      >,
      Composable<(a?: unknown, b?: unknown) => [{ id: number }, number]>
    >
  >
}

namespace PipeReturnWithEnvironment {
  type test = Expect<
    Equal<
      Subject.PipeReturnWithEnvironment<
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
      Subject.PipeReturnWithEnvironment<
        [
          Composable<(a?: unknown, e?: unknown) => { id: number }>,
          Composable<(a?: unknown, e?: unknown) => number>,
        ]
      >,
      Composable<(a?: unknown, b?: unknown) => number>
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
