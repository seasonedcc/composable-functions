import { DomainFunction, Result } from '../types.ts'

type StrictDomainFunction<
  Output = unknown,
  Input = unknown,
  Environment = unknown,
> = {
  (input?: Input, environment?: Environment): Promise<Result<Output>>
}

type StrictEnvironmentDomainFunction<
  Output = unknown,
  Input = unknown,
  Environment = unknown,
> = {
  (input?: unknown, environment?: Environment): Promise<Result<Output>>
}

type PipeReturn<DFs extends unknown> = DFs extends [
  DomainFunction<infer FO, infer FI, infer FE>,
  DomainFunction<infer SO, infer SI, infer SE>,
  ...infer rest,
]
  ? FO extends SI
    ? PipeReturn<[DomainFunction<SO, FI, FE & SE>, ...rest]>
    : void
  : DFs extends [DomainFunction<infer O, infer I, infer E>]
  ? DomainFunction<O, I, E>
  : void

function strict<O, I, E>(df: DomainFunction<O, I, E>) {
  return df as StrictDomainFunction<O, I, E>
}

function strictEnvironment<O, I, E>(df: DomainFunction<O, I, E>) {
  return df as StrictEnvironmentDomainFunction<O, I, E>
}

function pipe<T extends DomainFunction[]>(...fns: T): PipeReturn<T> {
  const [head, ...tail] = fns

  return ((input: unknown, environment?: unknown) => {
    return tail.reduce(async (memo, fn) => {
      const resolved = await memo
      if (resolved.success) {
        return fn(resolved.data as unknown, environment)
      } else {
        return memo
      }
    }, head(input, environment))
  }) as PipeReturn<T>
}

export { pipe, strict, strictEnvironment }
export type { StrictDomainFunction, StrictEnvironmentDomainFunction }
