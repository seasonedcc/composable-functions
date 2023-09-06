import type { ValidationIssue } from 'https://deno.land/x/typeschema@v0.10.0/mod.ts'

import type { MergeObjs, Result, SchemaError, SuccessResult } from './types.ts'

function formatSchemaErrors(errors: ValidationIssue[]): SchemaError[] {
  return errors.map((error) => {
    const { path, message } = error
    return { path: (path ?? []).map(String), message }
  })
}

function isListOfSuccess<T>(result: Result<T>[]): result is SuccessResult<T>[] {
  return result.every(({ success }) => success === true)
}

/**
 * Merges a list of objects into a single object.
 * It is a type-safe version of Object.assign.
 * @param objs the list of objects to merge
 * @returns the merged object
 * @example
 * const obj1 = { a: 1, b: 2 }
 * const obj2 = { c: 3 }
 * const obj3 = { d: 4 }
 * const merged = mergeObjects([obj1, obj2, obj3])
 * //   ^? { a: number, b: number, c: number, d: number }
 */
function mergeObjects<T extends unknown[] = unknown[]>(objs: T) {
  return Object.assign({}, ...objs) as MergeObjs<T>
}

function assertObject(data: unknown): object {
  if (data == null || typeof data !== 'object') {
    throw new Error('Expected an object')
  }
  return data
}

function assertUndefined(data: unknown): undefined {
  if (data !== undefined) {
    throw new Error('Expected undefined')
  }
  return data
}

export {
  formatSchemaErrors,
  mergeObjects,
  isListOfSuccess,
  assertObject,
  assertUndefined,
}
