import { Internal } from '../internal/types.ts'
import { Composable } from '../types.ts'

type CommonEnvironment<
  Fns extends any[],
  OriginalFns extends any[] = Fns,
> = Fns extends [
  Composable<(a: any, envA: infer EnvA, ...rest: any[]) => any>,
  ...infer restA,
]
  ? restA extends [
      Composable<(b: any, envB: infer EnvB, ...rest: any[]) => any>,
      ...infer restB,
    ]
    ? Internal.IsIncompatible<EnvA, EnvB> extends true
      ? Internal.IncompatibleArguments<EnvA, EnvB>
      : CommonEnvironment<
          [
            Composable<
              (
                a: any,
                envA: Internal.CommonSubType<EnvA, EnvB>,
                ...rest: any[]
              ) => any
            >,
            ...restB,
          ],
          OriginalFns
        >
    : ApplyEnvironmentsToFns<OriginalFns, EnvA>
  : never

type ApplyEnvironmentsToFns<
  Fns extends any[],
  Environment extends any,
  Output extends any[] = [],
> = Fns extends [
  (
    a: infer FirstParameter,
    env: any,
    ...rest: infer RestParameters
  ) => infer OA,
  ...infer restA,
]
  ? ApplyEnvironmentsToFns<
      restA,
      Environment,
      [
        ...Output,
        (a: FirstParameter, env: Environment, ...rest: RestParameters) => OA,
      ]
    >
  : Output

export type { CommonEnvironment }
