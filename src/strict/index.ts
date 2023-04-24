import { DomainFunction, Result } from '../types.ts'
import * as df from '../domain-functions.ts'

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
  return df.pipe(...fns) as unknown as PipeReturn<T>
}

export { pipe, strict, strictEnvironment }
export type { StrictDomainFunction, StrictEnvironmentDomainFunction }
