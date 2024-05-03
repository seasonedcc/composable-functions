import { Internal } from '../internal/types.ts'
import { Composable, PipeReturn, SequenceReturn, UnpackData } from '../types.ts'

type CommonEnvironment<
  Fns extends Composable[],
  Env extends [unknown?] = [unknown?],
> = Fns extends [] ? Env
  : Fns extends [
    Composable<(...args: infer CParameters) => any>,
    ...infer RestFns,
  ]
    ? GetEnv<CParameters> extends [unknown?]
      ? Internal.IsIncompatible<Env, GetEnv<CParameters>> extends true
        ? Internal.IncompatibleArguments<Env, GetEnv<CParameters>>
      : CommonEnvironment<
        Extract<RestFns, Composable[]>,
        Extract<Internal.CommonSubType<Env, GetEnv<CParameters>>, [unknown?]>
      >
    : never
  : never

type SequenceReturnWithEnvironment<Fns extends Composable[]> = SequenceReturn<
  PipeArgumentsWithEnvironment<Fns>
> extends Composable<(...args: any[]) => infer CReturn>
  ? CommonEnvironment<Fns> extends { 'Incompatible arguments ': true }
    ? CommonEnvironment<Fns>
  : Composable<
    (...args: SetEnv<Parameters<Fns[0]>, CommonEnvironment<Fns>>) => CReturn
  >
  : PipeArgumentsWithEnvironment<Fns>

type PipeReturnWithEnvironment<Fns extends Composable[]> = PipeReturn<
  PipeArgumentsWithEnvironment<Fns>
> extends Composable<(...args: any[]) => infer CReturn>
  ? CommonEnvironment<Fns> extends { 'Incompatible arguments ': true }
    ? CommonEnvironment<Fns>
  : Composable<
    (...args: SetEnv<Parameters<Fns[0]>, CommonEnvironment<Fns>>) => CReturn
  >
  : PipeArgumentsWithEnvironment<Fns>

type PipeArgumentsWithEnvironment<
  Fns extends any[],
  Arguments extends any[] = [],
> = Fns extends [Composable<(...a: infer PA) => infer OA>, ...infer restA]
  ? restA extends [
    Composable<
      (
        firstParameter: infer FirstBParameter,
        secondParameter: any,
        ...b: infer PB
      ) => any
    >,
    ...unknown[],
  ]
    ? Internal.IsNever<Awaited<OA>> extends true
      ? Internal.FailToCompose<never, FirstBParameter>
    : Awaited<OA> extends FirstBParameter
      ? Internal.EveryElementTakes<PB, undefined> extends true
        ? PipeArgumentsWithEnvironment<
          restA,
          [...Arguments, Composable<(...a: PA) => OA>]
        >
      : Internal.EveryElementTakes<PB, undefined>
    : Internal.FailToCompose<Awaited<OA>, FirstBParameter>
  : [...Arguments, Composable<(...a: PA) => OA>]
  : never

type GetEnv<Params extends unknown[]> = Params extends [
  unknown,
  infer envMandatory,
] ? [envMandatory]
  : Params extends Partial<[unknown, infer envOptional]> ? [envOptional?]
  : Params extends [...Partial<[unknown]>] ? [unknown?]
  : Params extends [...infer AnyArg] ? [AnyArg[1]]
  : never

type SetEnv<
  Params extends unknown[],
  Env extends [unknown?] = [unknown?],
> = Params extends [infer firstMandatory, ...any] ? [firstMandatory, ...Env]
  : Params extends [...Partial<[infer firstOptional, ...any]>]
    ? [firstOptional?, ...Env]
  : never

type BranchReturnWithEnvironment<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => Composable | null | Promise<Composable | null>,
> = PipeArgumentsWithEnvironment<
  [SourceComposable, Composable<Resolver>]
> extends Composable[]
  ? Awaited<ReturnType<Resolver>> extends null
    ? SourceComposable
    : PipeArgumentsWithEnvironment<
        [SourceComposable, Awaited<ReturnType<Resolver>>]
      > extends [Composable, ...any]
    ? Composable<
        (
          ...args: Parameters<
            PipeArgumentsWithEnvironment<
              [SourceComposable, Awaited<ReturnType<Resolver>>]
            >[0]
          >
        ) => null extends Awaited<ReturnType<Resolver>>
          ?
              | UnpackData<SourceComposable>
              | UnpackData<Extract<Awaited<ReturnType<Resolver>>, Composable>>
          : UnpackData<Extract<Awaited<ReturnType<Resolver>>, Composable>>
      >
    : PipeArgumentsWithEnvironment<
        [SourceComposable, Awaited<ReturnType<Resolver>>]
      >
  : PipeArgumentsWithEnvironment<[SourceComposable, Composable<Resolver>]>

export type {
  BranchReturnWithEnvironment,
  CommonEnvironment,
  GetEnv,
  PipeReturnWithEnvironment,
  SequenceReturnWithEnvironment,
  SetEnv,
}
