import { Internal } from '../internal/types.ts'
import { Composable, PipeReturn, SequenceReturn } from '../types.ts'

type CommonEnvironment<
  Fns extends Composable[],
  Env extends [unknown?] = [unknown?],
> = Fns extends []
  ? Env
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

type SequenceReturnWithEnvironment<Fns extends Composable[]> =
  SequenceReturn<Fns> extends Composable<(...args: any[]) => infer CReturn>
    ? CommonEnvironment<Fns> extends { 'Incompatible arguments ': true }
      ? CommonEnvironment<Fns>
      : Composable<
          (
            ...args: SetEnv<Parameters<Fns[0]>, CommonEnvironment<Fns>>
          ) => CReturn
        >
    : SequenceReturn<Fns>

type PipeReturnWithEnvironment<Fns extends Composable[]> =
  PipeReturn<Fns> extends Composable<(...args: any[]) => infer CReturn>
    ? CommonEnvironment<Fns> extends { 'Incompatible arguments ': true }
      ? CommonEnvironment<Fns>
      : Composable<
          (
            ...args: SetEnv<Parameters<Fns[0]>, CommonEnvironment<Fns>>
          ) => CReturn
        >
    : PipeReturn<Fns>

type GetEnv<Params extends unknown[]> = Params extends [
  unknown,
  infer envMandatory,
]
  ? [envMandatory]
  : Params extends Partial<[unknown, infer envOptional]>
  ? [envOptional?]
  : Params extends [...Partial<[unknown]>]
  ? [unknown?]
  : Params extends [...infer AnyArg]
  ? [AnyArg[1]]
  : never

type SetEnv<
  Params extends unknown[],
  Env extends [unknown?] = [unknown?],
> = Params extends [infer firstMandatory, ...any]
  ? [firstMandatory, ...Env]
  : Params extends [...Partial<[infer firstOptional, ...any]>]
  ? [firstOptional?, ...Env]
  : never

export type {
  GetEnv,
  SetEnv,
  CommonEnvironment,
  PipeReturnWithEnvironment,
  SequenceReturnWithEnvironment,
}
