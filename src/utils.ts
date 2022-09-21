import { z } from 'https://deno.land/x/zod@v3.19.1/mod.ts'

import type { MergeObjs, Result, SchemaError, SuccessResult } from './types.ts'

const formatSchemaErrors = (errors: z.ZodIssue[]): SchemaError[] =>
  errors.map((error) => {
    const { path, message } = error
    return { path: path.map(String), message }
  })

function isListOfSuccess<T>(result: Result<T>[]): result is SuccessResult<T>[] {
  return result.every(({ success }) => success === true)
}

const mergeObjects = <T extends unknown[] = unknown[]>(objs: T) =>
  Object.assign({}, ...objs) as MergeObjs<T>

export { formatSchemaErrors, mergeObjects, isListOfSuccess }
