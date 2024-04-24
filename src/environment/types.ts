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

type X = PipeReturnWithEnvironment<
  [
    Composable<(a: number, e?: unknown) => number>,
    Composable<(a: number, e: number) => number>,
    Composable<(a: number) => void>,
  ]
>

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

type GE1 = GetEnv<Parameters<Composable<(a: number, e: number) => void>>>
type GE2 = GetEnv<Parameters<Composable<() => void>>>
type GE3 = GetEnv<Parameters<Composable<(a: number, e?: number) => void>>>
type GE4 = GetEnv<Parameters<Composable<(a?: number, e?: number) => void>>>
type GE5 = GetEnv<Parameters<Composable>>
type GE6 = GetEnv<Parameters<Composable<(a?: unknown, b?: unknown) => void>>>

type SetEnv<
  Params extends unknown[],
  Env extends [unknown?] = [unknown?],
> = Params extends [infer firstMandatory, ...any]
  ? [firstMandatory, ...Env]
  : Params extends [...Partial<[infer firstOptional, ...any]>]
  ? [firstOptional?, ...Env]
  : never

type Y1 = SetEnv<Parameters<Composable<(a: number) => void>>>
type Y2 = SetEnv<Parameters<Composable<(a: number) => void>>, [number]>
type Y3 = SetEnv<Parameters<Composable<(a?: number) => void>>, [number]>
type Y4 = SetEnv<Parameters<Composable<() => void>>>
type Y5 = SetEnv<
  Parameters<Composable<(a?: unknown, e?: unknown) => void>>,
  [unknown?]
>
type CE = CommonEnvironment<
  [
    Composable<(a?: unknown, e?: unknown) => void>,
    Composable<(a?: unknown, e?: unknown) => void>,
  ]
>
type PRWE = PipeReturnWithEnvironment<
  [
    Composable<(a?: unknown, e?: unknown) => { id: number }>,
    Composable<(a?: unknown, e?: unknown) => number>,
  ]
>
type PR = PipeReturn<
  [
    Composable<(a?: unknown, e?: unknown) => { id: number }>,
    Composable<(a?: unknown, e?: unknown) => number>,
  ]
>

export type {
  CommonEnvironment,
  PipeReturnWithEnvironment,
  SequenceReturnWithEnvironment,
}
