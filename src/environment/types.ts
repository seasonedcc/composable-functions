import type { Internal } from '../internal/types.ts'
import type {
  Composable,
  PipeReturn as BasePipeReturn,
  SequenceReturn as BaseSequenceReturn,
  UnpackData,
} from '../types.ts'

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
        ? Internal.FailToCompose<Env, GetEnv<CParameters>>
      : CommonEnvironment<
        Extract<RestFns, Composable[]>,
        Extract<Internal.CommonSubType<Env, GetEnv<CParameters>>, [unknown?]>
      >
    : never
  : never

type SequenceReturn<Fns extends Composable[]> = BaseSequenceReturn<
  CanComposeInSequence<Fns>
> extends Composable<(...args: any[]) => infer CReturn>
  ? CommonEnvironment<Fns> extends Internal.IncompatibleArguments
    ? CommonEnvironment<Fns>
  : Composable<
    (...args: SetEnv<Parameters<Fns[0]>, CommonEnvironment<Fns>>) => CReturn
  >
  : CanComposeInSequence<Fns>

type PipeReturn<Fns extends Composable[]> = BasePipeReturn<
  CanComposeInSequence<Fns>
> extends Composable<(...args: any[]) => infer CReturn>
  ? CommonEnvironment<Fns> extends Internal.IncompatibleArguments
    ? CommonEnvironment<Fns>
  : Composable<
    (...args: SetEnv<Parameters<Fns[0]>, CommonEnvironment<Fns>>) => CReturn
  >
  : CanComposeInSequence<Fns>

type CanComposeInSequence<
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
        ? CanComposeInSequence<
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

type BranchEnvironment<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => Composable | null | Promise<Composable | null>,
> = Awaited<ReturnType<Resolver>> extends Composable<any>
  ? CommonEnvironment<[SourceComposable, Awaited<ReturnType<Resolver>>]>
  : GetEnv<Parameters<SourceComposable>>

type BranchReturn<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => Composable | null | Promise<Composable | null>,
> = CanComposeInSequence<
  [SourceComposable, Composable<Resolver>]
> extends Composable[]
  ? Awaited<ReturnType<Resolver>> extends null ? SourceComposable
  : CanComposeInSequence<
    [SourceComposable, Awaited<ReturnType<Resolver>>]
  > extends [Composable, ...any] ? Composable<
      (
        ...args: SetEnv<
          Parameters<
            CanComposeInSequence<
              [SourceComposable, Awaited<ReturnType<Resolver>>]
            >[0]
          >,
          BranchEnvironment<SourceComposable, Resolver>
        >
      ) => null extends Awaited<ReturnType<Resolver>> ?
          | UnpackData<SourceComposable>
          | UnpackData<Extract<Awaited<ReturnType<Resolver>>, Composable>>
        : UnpackData<Extract<Awaited<ReturnType<Resolver>>, Composable>>
    >
  : CanComposeInSequence<[SourceComposable, Awaited<ReturnType<Resolver>>]>
  : CanComposeInSequence<[SourceComposable, Composable<Resolver>]>

export type {
  BranchReturn,
  CommonEnvironment,
  GetEnv,
  PipeReturn,
  SequenceReturn,
  SetEnv,
}
