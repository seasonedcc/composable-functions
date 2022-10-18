import { z } from 'https://deno.land/x/zod@v3.19.1/mod.ts'

import {
  EnvironmentError,
  InputError,
  InputErrors,
  ResultError,
} from './errors.ts'
import { schemaError, toErrorWithMessage } from './errors.ts'
import { isListOfSuccess, formatSchemaErrors, mergeObjects } from './utils.ts'
import type {
  DomainFunction,
  ErrorData,
  MergeObjs,
  Result,
  TupleToUnion,
} from './types.ts'
import type { Last, List, ListToResultData } from './types.ts'
import type { SuccessResult } from './types.ts'

type MakeDomainFunction = <
  Schema extends z.ZodTypeAny,
  EnvSchema extends z.ZodTypeAny,
>(
  inputSchema: Schema,
  environmentSchema?: EnvSchema,
) => <Output>(
  handler: (
    inputSchema: z.infer<Schema>,
    environmentSchema: z.infer<EnvSchema>,
  ) => Promise<Output>,
) => DomainFunction<Output>

const makeDomainFunction: MakeDomainFunction =
  (
    inputSchema: z.ZodTypeAny = z.object({}),
    environmentSchema: z.ZodTypeAny = z.object({}),
  ) =>
  (handler) => {
    const domainFunction = (async (input, environment = {}) => {
      const envResult = await environmentSchema.safeParseAsync(environment)
      const result = await inputSchema.safeParseAsync(input)

      try {
        if (result.success === true && envResult.success === true) {
          return {
            success: true,
            data: await handler(result.data, envResult.data),
            errors: [],
            inputErrors: [],
            environmentErrors: [],
          }
        }
      } catch (error) {
        if (error instanceof InputError) {
          return {
            success: false,
            errors: [],
            environmentErrors: [],
            inputErrors: [schemaError(error.message, error.path)],
          }
        }
        if (error instanceof EnvironmentError) {
          return {
            success: false,
            errors: [],
            environmentErrors: [schemaError(error.message, error.path)],
            inputErrors: [],
          }
        }
        if (error instanceof InputErrors) {
          return {
            success: false,
            errors: [],
            environmentErrors: [],
            inputErrors: error.errors.map((e) =>
              schemaError(e.message, e.path),
            ),
          }
        }
        if (error instanceof ResultError) return error.result

        return {
          success: false,
          errors: [toErrorWithMessage(error)],
          inputErrors: [],
          environmentErrors: [],
        }
      }
      return {
        success: false,
        errors: [],
        inputErrors: result.success
          ? []
          : formatSchemaErrors(result.error.issues),
        environmentErrors: envResult.success
          ? []
          : formatSchemaErrors(envResult.error.issues),
      }
    }) as DomainFunction<Awaited<ReturnType<typeof handler>>>
    return domainFunction
  }

type All = <Fns extends DomainFunction[]>(
  ...fns: Fns
) => DomainFunction<List.Map<ListToResultData, Fns>>
const all: All = (...fns) => {
  return async (input, environment) => {
    const results = await Promise.all(
      fns.map((fn) => (fn as DomainFunction)(input, environment)),
    )

    if (!isListOfSuccess(results)) {
      return {
        success: false,
        errors: results.map(({ errors }) => errors).flat(),
        inputErrors: results.map(({ inputErrors }) => inputErrors).flat(),
        environmentErrors: results
          .map(({ environmentErrors }) => environmentErrors)
          .flat(),
      }
    }

    return {
      success: true,
      data: results.map(({ data }) => data),
      inputErrors: [],
      environmentErrors: [],
      errors: [],
    } as SuccessResult<List.Map<ListToResultData, typeof fns>>
  }
}

type First = <Fns extends DomainFunction[]>(
  ...fns: Fns
) => DomainFunction<TupleToUnion<List.Map<ListToResultData, Fns>>>
const first: First = (...fns) => {
  return async (input, environment) => {
    const results = await Promise.all(
      fns.map((fn) => (fn as DomainFunction)(input, environment)),
    )

    const result = results.find((r) => r.success) as SuccessResult | undefined
    if (result) {
      return {
        success: true,
        data: result.data,
        inputErrors: [],
        environmentErrors: [],
        errors: [],
      } as SuccessResult<TupleToUnion<List.Map<ListToResultData, typeof fns>>>
    }

    return {
      success: false,
      errors: results.map(({ errors }) => errors).flat(),
      inputErrors: results.map(({ inputErrors }) => inputErrors).flat(),
      environmentErrors: results
        .map(({ environmentErrors }) => environmentErrors)
        .flat(),
    }
  }
}

type Merge = <Fns extends DomainFunction[]>(
  ...fns: Fns
) => DomainFunction<MergeObjs<List.Map<ListToResultData, Fns>>>
const merge: Merge = (...fns) => {
  return async (input, environment) => {
    const results = await Promise.all(
      fns.map((fn) => (fn as DomainFunction)(input, environment)),
    )

    if (!isListOfSuccess(results)) {
      return {
        success: false,
        errors: results.map(({ errors }) => errors).flat(),
        inputErrors: results.map(({ inputErrors }) => inputErrors).flat(),
        environmentErrors: results
          .map(({ environmentErrors }) => environmentErrors)
          .flat(),
      }
    }

    const collectedResults = results.map(({ data }) => data)

    const resultSchema = z.array(z.object({}))
    if (!resultSchema.safeParse(collectedResults).success) {
      return {
        success: false,
        errors: [
          { message: 'Invalid data format returned from some domainFunction' },
        ],
        inputErrors: [],
        environmentErrors: [],
      }
    }

    return {
      success: true,
      data: mergeObjects(collectedResults),
      inputErrors: [],
      environmentErrors: [],
      errors: [],
    } as SuccessResult<MergeObjs<List.Map<ListToResultData, typeof fns>>>
  }
}

type Pipe = <T extends DomainFunction[]>(...fns: T) => Last<T>
const pipe: Pipe = (...fns) => {
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
  }) as Last<typeof fns>
}

type Sequence = <Fns extends DomainFunction[]>(
  ...fns: Fns
) => DomainFunction<List.Map<ListToResultData, Fns>>
const sequence: Sequence = (...fns) => {
  return async function (input: unknown, environment?: unknown) {
    const results = []
    let currResult: undefined | Result<unknown>
    for await (const fn of fns as DomainFunction[]) {
      const result = await fn(
        currResult?.success ? currResult.data : input,
        environment,
      )
      if (!result.success) return result
      currResult = result
      results.push(result.data)
    }

    return {
      success: true,
      data: results,
      inputErrors: [],
      environmentErrors: [],
      errors: [],
    } as SuccessResult<List.Map<ListToResultData, typeof fns>>
  }
}

type Map = <O, R>(
  dfn: DomainFunction<O>,
  mapper: (element: O) => R,
) => DomainFunction<R>
const map: Map = (dfn, mapper) => {
  return async (input, environment) => {
    const result = await dfn(input, environment)
    if (!result.success) return result

    try {
      return {
        success: true,
        data: mapper(result.data),
        errors: [],
        inputErrors: [],
        environmentErrors: [],
      }
    } catch (error) {
      const errors = [toErrorWithMessage(error)]
      return {
        success: false,
        errors,
        inputErrors: [],
        environmentErrors: [],
      }
    }
  }
}

type FromSuccess = <R, T extends DomainFunction<R>>(
  df: T,
) => (input: unknown, environment?: unknown) => Promise<R>
const fromSuccess: FromSuccess = (df) => async (input, environment) => {
  const result = await df(input, environment)

  if (!result.success) throw new ResultError(result)
  return result.data
}

type MapError = <O>(
  dfn: DomainFunction<O>,
  mapper: (element: ErrorData) => ErrorData,
) => DomainFunction<O>
const mapError: MapError = (dfn, mapper) => {
  return async (input, environment) => {
    const result = await dfn(input, environment)
    if (result.success) return result

    try {
      return { ...mapper(result), success: false }
    } catch (error) {
      const errors = [toErrorWithMessage(error)]
      return {
        success: false,
        errors,
        inputErrors: [],
        environmentErrors: [],
      }
    }
  }
}

export {
  all,
  first,
  fromSuccess,
  makeDomainFunction,
  map,
  mapError,
  merge,
  pipe,
  sequence,
}
