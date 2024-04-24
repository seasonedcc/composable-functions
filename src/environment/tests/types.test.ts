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
}
