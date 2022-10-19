import { z } from 'https://deno.land/x/zod@v3.19.1/mod.ts'

import type { MergeObjs, Result, SchemaError, SuccessResult } from './types.ts'

function formatSchemaErrors(errors: z.ZodIssue[]): SchemaError[] {
  return errors.map((error) => {
    const { path, message } = error
    return { path: path.map(String), message }
  })
}

function isListOfSuccess<T>(result: Result<T>[]): result is SuccessResult<T>[] {
  return result.every(({ success }) => success === true)
}

function mergeObjects<T extends unknown[] = unknown[]>(objs: T) {
  return Object.assign({}, ...objs) as MergeObjs<T>
}

export { formatSchemaErrors, mergeObjects, isListOfSuccess }
