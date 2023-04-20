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

function strict<O, I, E>(df: DomainFunction<O, I, E>) {
  return df as StrictDomainFunction<O, I, E>
}

function strictEnvironment<O, I, E>(df: DomainFunction<O, I, E>) {
  return df as StrictEnvironmentDomainFunction<O, I, E>
}

export { strict, strictEnvironment }
export type { StrictDomainFunction, StrictEnvironmentDomainFunction }
