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
  UnpackAll,
  UnpackData,
  UnpackDFObject,
  UnpackResult,
} from './types.ts'
import type { Last } from './types.ts'
import type { SuccessResult } from './types.ts'

function makeDomainFunction<
  Schema extends z.ZodTypeAny,
  EnvSchema extends z.ZodTypeAny,
>(inputSchema?: Schema, environmentSchema?: EnvSchema) {
  return function <Output>(
    handler: (
      input: z.infer<Schema>,
      environment: z.infer<EnvSchema>,
    ) => Promise<Output>,
  ) {
    return async function (input, environment = {}) {
      const envResult = await (
        environmentSchema ?? z.object({})
      ).safeParseAsync(environment)
      const result = await (inputSchema ?? z.undefined()).safeParseAsync(input)

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
    } as DomainFunction<Output>
  }
}

function all<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<UnpackAll<Fns>> {
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
    } as SuccessResult<UnpackAll<Fns>>
  }
}

function namedAll<Fns extends Record<string, DomainFunction>>(
  fns: Fns,
): DomainFunction<UnpackDFObject<Fns>> {
  return async (input, environment) => {
    const results = await Promise.all(
      Object.entries(fns).map(
        async ([key, fn]) =>
          [key, await (fn as DomainFunction)(input, environment)] as const,
      ),
    )

    const collectedResults = results.map(([, result]) => result)
    if (!isListOfSuccess(collectedResults)) {
      return {
        success: false,
        errors: collectedResults.map(({ errors }) => errors).flat(),
        inputErrors: collectedResults
          .map(({ inputErrors }) => inputErrors)
          .flat(),
        environmentErrors: collectedResults
          .map(({ environmentErrors }) => environmentErrors)
          .flat(),
      }
    }

    const allData = results.map(([key, result]) => [
      key,
      (result as SuccessResult).data,
    ])
    return {
      success: true,
      data: Object.fromEntries(allData),
      inputErrors: [],
      environmentErrors: [],
      errors: [],
    } as SuccessResult<UnpackDFObject<Fns>>
  }
}

function first<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<TupleToUnion<UnpackAll<Fns>>> {
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
      } as SuccessResult<TupleToUnion<UnpackAll<Fns>>>
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

function merge<Fns extends DomainFunction<Record<string, unknown>>[]>(
  ...fns: Fns
): DomainFunction<MergeObjs<UnpackAll<Fns>>> {
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
    } as SuccessResult<MergeObjs<UnpackAll<Fns>>>
  }
}

function pipe<T extends DomainFunction[]>(...fns: T): Last<T> {
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
  }) as Last<T>
}

function sequence<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<UnpackAll<Fns>> {
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
    } as SuccessResult<UnpackAll<Fns>>
  }
}

function map<O, R>(
  dfn: DomainFunction<O>,
  mapper: (element: O) => R,
): DomainFunction<R> {
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
  first,
  fromSuccess,
  makeDomainFunction,
  map,
  mapError,
  merge,
  namedAll,
  pipe,
  sequence,
  trace,
}
