// deno-lint-ignore-file no-namespace

import type { Internal } from '../../internal/types.ts'
import type { Composable } from '../../types.ts'
import type * as Subject from '../types.ts'

namespace CommonContext {
  type testNoEmptyArgumentList = Expect<
    Equal<Subject.CommonContext<[]>, [unknown?]>
  >
  type testOneComposable = Expect<
    Equal<Subject.CommonContext<[Composable]>, [any]>
  >
  type testForTwoOptionalUnknowns = Expect<
    Equal<
      Subject.CommonContext<
        [
          Composable<(x: string, ctx?: unknown) => number>,
          Composable<(y: number, ctx?: unknown) => boolean>,
        ]
      >,
      [unknown?]
    >
  >
  type testForTwoComposables = Expect<
    Equal<
      Subject.CommonContext<
        [
          Composable<(x: string, ctx: number) => number>,
          Composable<(y: number, ctx: 1) => boolean>,
        ]
      >,
      [1]
    >
  >
  type testForComponentsWithArityGreaterThan1WithOptionalParameters = Expect<
    Equal<
      Subject.CommonContext<
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
      Subject.CommonContext<
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
      Subject.CommonContext<
        [
          Composable<(x: string, ctx: number) => void>,
          Composable<(y: number, ctx: string) => boolean>,
        ]
      >,
      Internal.FailToCompose<[number], [string]>
    >
  >

  type testMultipleOptionalUnknown = Expect<
    Equal<
      Subject.CommonContext<
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
  type _ = Subject.BranchReturn<
    Composable<(a: number, e?: unknown) => number>,
    (a: number) => Composable<(a: number, e: number) => string>
  >
  // TODO: Fix this test
  // type testCommonCtx = Expect<
  //   Equal<
  //     Subject.BranchReturn<
  //       Composable<(a: number, e?: unknown) => number>,
  //       (a: number) => Composable<(a: number, e: number) => string>
  //     >,
  //     Composable<(a: number, e: number) => string>
  //   >
  // >
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

namespace GetContext {
  type test1 = Expect<
    Equal<
      Subject.GetContext<
        Parameters<Composable<(a: number, e: number) => void>>
      >,
      [number]
    >
  >
  type test2 = Expect<
    Equal<Subject.GetContext<Parameters<Composable<() => void>>>, [unknown?]>
  >
  type test3 = Expect<
    Equal<
      Subject.GetContext<
        Parameters<Composable<(a: number, e?: number) => void>>
      >,
      [number?]
    >
  >
  type test4 = Expect<
    Equal<
      Subject.GetContext<
        Parameters<Composable<(a?: number, e?: number) => void>>
      >,
      [number?]
    >
  >
  type test5 = Expect<Equal<Subject.GetContext<Parameters<Composable>>, [any]>>
  type test6 = Expect<
    Equal<
      Subject.GetContext<
        Parameters<Composable<(a?: unknown, b?: unknown) => void>>
      >,
      [unknown?]
    >
  >
}

namespace SetContext {
  type test1 = Expect<
    Equal<
      Subject.SetContext<Parameters<Composable<(a: number) => void>>>,
      [number, unknown?]
    >
  >
  type test2 = Expect<
    Equal<
      Subject.SetContext<Parameters<Composable<(a: number) => void>>, [number]>,
      [number, number]
    >
  >
  type test3 = Expect<
    Equal<
      Subject.SetContext<
        Parameters<Composable<(a?: number) => void>>,
        [number]
      >,
      [number | undefined, number]
    >
  >
  type test4 = Expect<
    Equal<
      Subject.SetContext<Parameters<Composable<() => void>>>,
      [unknown?, unknown?]
    >
  >
  type test5 = Expect<
    Equal<
      Subject.SetContext<
        Parameters<Composable<(a?: unknown, e?: unknown) => void>>,
        [unknown?]
      >,
      [unknown?, unknown?]
    >
  >
}
