import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import { ResultError } from './errors.ts'
import { isListOfSuccess, mergeObjects } from './utils.ts'
import type {
  DomainFunction,
  ErrorData,
  MergeObjs,
  Result,
  TupleToUnion,
  UnpackAll,
  UnpackData,
  UnpackDFObject,
  UnpackResult,
} from './types.ts'
import type { Last } from './types.ts'
import type { SuccessResult } from './types.ts'
import { safeResult } from './constructor.ts'

function all<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<UnpackAll<Fns>> {
  return ((input, environment) => {
    return safeResult(async () => {
      const results = await Promise.all(
        fns.map((fn) => (fn as DomainFunction)(input, environment)),
      )

      if (!isListOfSuccess(results)) {
        throw new ResultError({
          errors: results.map(({ errors }) => errors).flat(),
          inputErrors: results.map(({ inputErrors }) => inputErrors).flat(),
          environmentErrors: results
            .map(({ environmentErrors }) => environmentErrors)
            .flat(),
        })
      }

      return results.map(({ data }) => data)
    })
  }) as DomainFunction<UnpackAll<Fns>>
}

function collect<Fns extends Record<string, DomainFunction>>(
  fns: Fns,
): DomainFunction<UnpackDFObject<Fns>> {
  const dfsWithKey = Object.entries(fns).map(([key, df]) =>
    map(df, (result) => ({ [key]: result })),
  )
  return map(all(...dfsWithKey), mergeObjects) as DomainFunction<
    UnpackDFObject<Fns>
  >
}

function first<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<TupleToUnion<UnpackAll<Fns>>> {
  return ((input, environment) => {
    return safeResult(async () => {
      const results = await Promise.all(
        fns.map((fn) => (fn as DomainFunction)(input, environment)),
      )

      const result = results.find((r) => r.success) as SuccessResult | undefined
      if (!result) {
        throw new ResultError({
          errors: results.map(({ errors }) => errors).flat(),
          inputErrors: results.map(({ inputErrors }) => inputErrors).flat(),
          environmentErrors: results
            .map(({ environmentErrors }) => environmentErrors)
            .flat(),
        })
      }

      return result.data
    })
  }) as DomainFunction<TupleToUnion<UnpackAll<Fns>>>
}

/**
 * **NOTE :** Try to use [collect](collect) instead wherever possible since it is much safer. `merge` can create domain functions that will always fail in run-time or even overwrite data from successful constituent functions application. The `collect` function does not have these issues and serves a similar purpose.
 */
function merge<Fns extends DomainFunction<Record<string, unknown>>[]>(
  ...fns: Fns
): DomainFunction<MergeObjs<UnpackAll<Fns>>> {
  return map(all(...fns), (results) => {
    const resultSchema = z.record(z.any())
    if (results.some((r) => resultSchema.safeParse(r).success === false)) {
      throw new Error('Invalid data format returned from some domainFunction')
    }
    return mergeObjects(results)
  })
}

function pipe<T extends DomainFunction[]>(
  ...fns: T
): DomainFunction<Last<UnpackAll<T>>> {
  const last = <T>(ls: T[]): T => ls[ls.length - 1]
  return map(sequence(...fns), last)
}

function sequence<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<UnpackAll<Fns>> {
  return function (input: unknown, environment?: unknown) {
    return safeResult(async () => {
      const results = []
      let currResult: undefined | Result<unknown>
      for await (const fn of fns) {
        const result = await fn(
          currResult?.success ? currResult.data : input,
          environment,
        )
        if (!result.success) throw new ResultError(result)
        currResult = result
        results.push(result.data)
      }

      return results
    })
  } as DomainFunction<UnpackAll<Fns>>
}

function map<O, R>(
  dfn: DomainFunction<O>,
  mapper: (element: O) => R,
): DomainFunction<R> {
  return async (input, environment) => {
    const result = await dfn(input, environment)
    if (!result.success) return result

    return safeResult(() => mapper(result.data))
  }
}

function branch<T, Df extends DomainFunction>(
  dfn: DomainFunction<T>,
  resolver: (o: T) => Promise<Df> | Df,
): DomainFunction<UnpackData<Df>> {
  return async (input, environment) => {
    const result = await dfn(input, environment)
    if (!result.success) return result

    return safeResult(async () => {
      const nextDf = await resolver(result.data)
      return fromSuccess(nextDf)(result.data, environment)
    })
  }
}

function fromSuccess<T extends DomainFunction>(
  df: T,
): (...args: Parameters<DomainFunction>) => Promise<UnpackData<T>> {
  return async function (...args) {
    const result = await df(...args)
    if (!result.success) throw new ResultError(result)

    return result.data
  }
}

function mapError<O>(
  dfn: DomainFunction<O>,
  mapper: (element: ErrorData) => ErrorData,
): DomainFunction<O> {
  return async (input, environment) => {
    const result = await dfn(input, environment)
    if (result.success) return result

    return safeResult(() => {
      throw new ResultError({ ...mapper(result) })
    })
  }
}

type TraceData<T> = {
  input: unknown
  environment: unknown
  result: T
}
function trace<D extends DomainFunction = DomainFunction<unknown>>(
  traceFn: ({ input, environment, result }: TraceData<UnpackResult<D>>) => void,
): <T>(fn: DomainFunction<T>) => DomainFunction<T> {
  return (fn) => async (input, environment) => {
    const result = await fn(input, environment)
    traceFn({ input, environment, result } as TraceData<UnpackResult<D>>)
    return result
  }
}

export {
  all,
  branch,
  collect,
  first,
  fromSuccess,
  map,
  mapError,
  merge,
  pipe,
  sequence,
  trace,
}
