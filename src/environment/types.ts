import { UnpackData } from '../index.ts'
import { Internal } from '../internal/types.ts'
import { Composable, Last } from '../types.ts'

type CommonEnvironment<
  Fns extends any[],
  OriginalFns extends any[] = Fns,
> = Fns extends [
  Composable<(a: any, envA: infer EnvA) => infer O>,
  ...infer restA,
]
  ? restA extends [
      Composable<(b: any, envB: infer EnvB) => any>,
      ...infer restB,
    ]
    ? Internal.IsIncompatible<EnvA, EnvB> extends true
      ? Internal.IncompatibleArguments<EnvA, EnvB>
      : CommonEnvironment<
          [
            Composable<
              (a: any, envA: Internal.CommonSubType<EnvA, EnvB>) => any
            >,
            ...restB,
          ],
          OriginalFns
        >
    : Composable<
        // TODO: Find where is the infinite loop when we use:
        // (...args: ReplaceEnv<Parameters<OriginalFns[0]>, EnvA>) => UnpackData<Last<OriginalFns>>
        (
          ...args: ReplaceEnv<[string, unknown], EnvA>
        ) => UnpackData<Last<OriginalFns>>
      >
  : never

type ReplaceEnv<
  Params extends unknown[],
  Env,
  Output extends unknown[] = [],
> = Params extends []
  ? Output
  : Params extends [infer headA, ...infer restA]
  ? ReplaceEnv<restA, Env, [...Output, headA]>
  : Params extends Partial<[infer headAPartial, ...infer restAPartial]>
  ? ReplaceEnv<
      Partial<restAPartial>,
      Env,
      [...Output, (headAPartial | undefined)?]
    >
  : never

export type { CommonEnvironment }
