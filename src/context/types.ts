import type { Internal } from '../internal/types.ts'
import type {
  AnyFn,
  Composable,
  FailToCompose,
  IncompatibleArguments,
  PipeReturn as BasePipeReturn,
  SequenceReturn as BaseSequenceReturn,
  UnpackData,
} from '../types.ts'

type CommonContext<
  Fns extends Composable[],
  Ctx extends [unknown?] = [unknown?],
> = Fns extends [] ? Ctx
  : Fns extends [
    Composable<(...args: infer CParameters) => any>,
    ...infer RestFns,
  ]
    ? GetContext<CParameters> extends [unknown?]
      ? Internal.IsIncompatible<Ctx, GetContext<CParameters>> extends true
        ? FailToCompose<Ctx, GetContext<CParameters>>
      : CommonContext<
        Extract<RestFns, Composable[]>,
        Extract<
          Internal.CommonSubType<Ctx, GetContext<CParameters>>,
          [unknown?]
        >
      >
    : never
  : never

/**
 * The return type of the withContext.sequence function.
 * It is only exported so generated declaration files can reference it.
 * It is an implementation detail: avoid using it directly, as it may change without notice.
 */
type SequenceReturn<Fns extends Composable[]> = BaseSequenceReturn<
  CanComposeInSequence<Fns>
> extends Composable<(...args: any[]) => infer CReturn>
  ? CommonContext<Fns> extends IncompatibleArguments ? CommonContext<Fns>
  : Composable<
    (...args: SetContext<Parameters<Fns[0]>, CommonContext<Fns>>) => CReturn
  >
  : CanComposeInSequence<Fns>

/**
 * The return type of the withContext.pipe function.
 * It is only exported so generated declaration files can reference it.
 * It is an implementation detail: avoid using it directly, as it may change without notice.
 */
type PipeReturn<Fns extends Composable[]> = BasePipeReturn<
  CanComposeInSequence<Fns>
> extends Composable<(...args: any[]) => infer CReturn>
  ? CommonContext<Fns> extends IncompatibleArguments ? CommonContext<Fns>
  : Composable<
    (...args: SetContext<Parameters<Fns[0]>, CommonContext<Fns>>) => CReturn
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
      ? FailToCompose<never, FirstBParameter>
    : Awaited<OA> extends FirstBParameter
      ? Internal.EveryElementTakes<PB, undefined> extends true
        ? CanComposeInSequence<
          restA,
          [...Arguments, Composable<(...a: PA) => OA>]
        >
      : Internal.EveryElementTakes<PB, undefined>
    : FailToCompose<Awaited<OA>, FirstBParameter>
  : [...Arguments, Composable<(...a: PA) => OA>]
  : never

type GetContext<Params extends unknown[]> = Params extends [
  unknown,
  infer ctxMandatory,
] ? [ctxMandatory]
  : Params extends Partial<[unknown, infer ctxOptional]> ? [ctxOptional?]
  : Params extends [...Partial<[unknown]>] ? [unknown?]
  : Params extends [...infer AnyArg] ? [AnyArg[1]]
  : never

/**
 * Replaces the context parameter in a list of parameters.
 * It is only exported so generated declaration files can reference it.
 * It is an implementation detail: avoid using it directly, as it may change without notice.
 */
type SetContext<
  Params extends unknown[],
  Ctx extends [unknown?] = [unknown?],
> = Params extends [infer firstMandatory, ...any] ? [firstMandatory, ...Ctx]
  : Params extends [...Partial<[infer firstOptional, ...any]>]
    ? [firstOptional?, ...Ctx]
  : never

type BranchContext<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => AnyFn | null | Promise<AnyFn | null>,
> = Awaited<ReturnType<Resolver>> extends AnyFn ? CommonContext<
    [SourceComposable, Composable<NonNullable<Awaited<ReturnType<Resolver>>>>]
  >
  : GetContext<Parameters<SourceComposable>>

/**
 * The return type of the withContext.branch function.
 * It is only exported so generated declaration files can reference it.
 * It is an implementation detail: avoid using it directly, as it may change without notice.
 */
type BranchReturn<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => AnyFn | null | Promise<AnyFn | null>,
> = CanComposeInSequence<
  [SourceComposable, Composable<Resolver>]
> extends Composable[]
  ? Awaited<ReturnType<Resolver>> extends null ? SourceComposable
  : CanComposeInSequence<
    [SourceComposable, Awaited<ReturnType<Resolver>>]
  > extends [Composable, ...any] ? Composable<
      (
        ...args: SetContext<
          Parameters<
            CanComposeInSequence<
              [SourceComposable, Awaited<ReturnType<Resolver>>]
            >[0]
          >,
          BranchContext<SourceComposable, Resolver>
        >
      ) => null extends Awaited<ReturnType<Resolver>> ?
          | UnpackData<SourceComposable>
          | UnpackData<Composable<NonNullable<Awaited<ReturnType<Resolver>>>>>
        : UnpackData<Composable<NonNullable<Awaited<ReturnType<Resolver>>>>>
    >
  : CanComposeInSequence<[SourceComposable, Awaited<ReturnType<Resolver>>]>
  : CanComposeInSequence<[SourceComposable, Composable<Resolver>]>

export type {
  BranchReturn,
  CommonContext,
  GetContext,
  PipeReturn,
  SequenceReturn,
  SetContext,
}
