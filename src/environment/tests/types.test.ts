// deno-lint-ignore-file no-namespace ban-ts-comment

import { Composable } from '../../types.ts'
import * as Subject from '../types.ts'

namespace CommonEnvironment {
  type testNoEmptyArgumentList = Expect<
    Equal<Subject.CommonEnvironment<[]>, never>
  >
  type testOneComposable = Expect<
    Equal<
      Subject.CommonEnvironment<[Composable]>,
      [Composable<(a: any, env: any, ...rest: any[]) => any>]
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
      [
        Composable<(x: string, env: 1) => number>,
        Composable<(y: number, env: 1) => boolean>,
      ]
    >
  >
  type testForComponentsWithArityGreaterThan1WithOptionalParameters = Expect<
    Equal<
      Subject.CommonEnvironment<
        [
          Composable<(x: string) => number>,
          Composable<(y: number, optionalArgument?: string) => boolean>,
        ]
      >,
      [
        Composable<(x: string, optionalArgument: string | undefined) => number>,
        Composable<
          (y: number, optionalArgument: string | undefined) => boolean
        >,
      ]
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
      [
        Composable<(x: string, willBeUndefined: string) => number>,
        Composable<(y: number, willBeUndefined: string) => boolean>,
      ]
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
        argument1: number
        argument2: string
      }
    >
  >
}
