import { mapError } from './combinators.ts'
import { ErrorList } from './errors.ts'
import { DomainFunction } from './index.ts'
import type { Composable, Failure, Fn, Success } from './types.ts'

function success<const T>(data: T): Success<T> {
  return { success: true, data, errors: [] }
}

function failure(errors: Error[]): Failure {
  return { success: false, errors }
}

function toError(maybeError: unknown): Error {
  if (maybeError instanceof Error) return maybeError
  try {
    return new Error(JSON.stringify(maybeError))
  } catch (_e) {
    return new Error(String(maybeError))
  }
}

/**
 * Creates a composable function.
 * That function is gonna catch any errors and always return a Result.
 * @param fn a function to be used as a Composable
 */
function composable<T extends Fn>(fn: T): Composable<T> {
  return async (...args) => {
    try {
      // deno-lint-ignore no-explicit-any
      const result = await fn(...(args as any[]))
      return success(result)
    } catch (e) {
      if (e instanceof ErrorList) {
        return failure(e.list)
      }
      return failure([toError(e)])
    }
  }
}

/**
 * It can be used to call a domain function from another domain function. It will return the output of the given domain function if it was successfull, otherwise it will throw a `ErrorList` that will bubble up to the parent function.
 * Also good to use it in successfull test cases.
 * @example
 * import { mdf, fromSuccess } from 'domain-functions'
 *
 * const add1 = mdf(z.number())((n) => n + 1)
 * const result = await add1(1)
 * //    ^? Result<number>
 * const data = await fromSuccess(add1)(n)
 * //    ^? number
 * expect(data).toBe(n + 1)
 */
type OnError = (errors: Error[]) => Error[] | Promise<Error[]>
function fromSuccess<O, T extends Composable<(...a: any[]) => O>>(
  fn: T,
  onError?: OnError,
): T extends Composable<(...a: infer P) => infer O>
  ? (...args: P) => Promise<O>
  : never
function fromSuccess<O, T extends DomainFunction<O>>(
  fn: T,
  onError?: OnError,
): (...args: Parameters<DomainFunction>) => Promise<O>
function fromSuccess<T extends Fn>(fn: T, onError: OnError = (e) => e) {
  return async (...args: any[]) => {
    const result = await mapError(fn, onError)(...args)
    if (result.success) return result.data

    throw new ErrorList(result.errors)
  }
}

export { composable, failure, fromSuccess, success }
