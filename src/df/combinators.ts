import type { Composable, Last, UnpackAll } from '../types.ts'
import * as A from '../combinators.ts'
import type { DomainFunction, UnpackDFObject, UnpackData } from './types.ts'
import { composable, fromSuccess } from '../constructors.ts'
import { applyEnvironment } from './constructors.ts'

function applyEnvironmentToList<
  Fns extends Array<(input: unknown, environment: unknown) => unknown>,
>(fns: Fns, environment: unknown) {
  return fns.map((fn) => applyEnvironment(fn, environment)) as [Composable]
}

/**
 * Creates a single domain function out of a chain of multiple domain functions. It will pass the same environment to all given functions, and it will pass the output of a function as the next function's input in left-to-right order. The resulting data will be the output of the rightmost function.
 * @example
 * import { mdf, pipe } from 'domain-functions'
 *
 * const a = mdf(z.object({ aNumber: z.number() }))(
 *   ({ aNumber }) => ({ aString: String(aNumber) }),
 * )
 * const b = mdf(z.object({ aString: z.string() }))(
 *   ({ aString }) => ({ aBoolean: aString == '1' }),
 * )
 * const d = pipe(a, b)
 * //    ^? DomainFunction<{ aBoolean: boolean }>
 */
function pipe<T extends DomainFunction[]>(
  ...fns: T
): DomainFunction<Last<UnpackAll<T>>> {
  return (input, environment) =>
    A.pipe(...applyEnvironmentToList(fns, environment))(input)
}

/**
 * Receives a Record of domain functions, runs them all in sequence like `pipe` but preserves the shape of that record for the data property in successful results.
 * It will pass the same environment to all given functions, and it will pass the output of a function as the next function's input in the given order.
 *
 * **NOTE :** After ECMAScript2015 JS is able to keep the order of keys in an object, we are relying on that. However, number-like keys such as { 1: 'foo' } will be ordered and may break the given order.
 * @example
 * import { mdf, collectSequence } from 'domain-functions'
 *
 * const a = mdf(z.object({}))(() => '1')
const b = mdf(z.number())((n) => n + 2)
const df = collectSequence({ a, b })
//    ^? DomainFunction<{ a: string, b: number }>
 */
function collectSequence<Fns extends Record<string, DomainFunction>>(
  fns: Fns,
): DomainFunction<UnpackDFObject<Fns>> {
  const keys = Object.keys(fns)

  return A.map(
    A.map(sequence(...Object.values(fns)), (outputs) =>
      outputs.map((o, i) => ({
        [keys[i]]: o,
      })),
    ),
    A.mergeObjects,
  ) as DomainFunction<UnpackDFObject<Fns>>
}

/**
 * Works like `pipe` but it will collect the output of every function in a tuple.
 * @example
 * import { mdf, sequence } from 'domain-functions'
 *
 * const a = mdf(z.number())((aNumber) => String(aNumber))
 * const b = mdf(z.string())((aString) => aString === '1')
 * const df = sequence(a, b)
 * //    ^? DomainFunction<[string, boolean]>
 */
function sequence<Fns extends DomainFunction[]>(
  ...fns: Fns
): DomainFunction<UnpackAll<Fns>> {
  return ((input, environment) =>
    A.sequence(...applyEnvironmentToList(fns, environment))(
      input,
    )) as DomainFunction<UnpackAll<Fns>>
}

/**
 * Use it to add conditional logic to your domain functions' compositions.
 * It receives a domain function and a predicate function that should return the next domain function to be executed based on the previous domain function's output, like `pipe`. If the predicate returns `null` the result of the previous domain function will be returned and it won't be piped.
 * @example
 * import { mdf, branch } from 'domain-functions'
 *
 * const getIdOrEmail = mdf(z.object({ id: z.number().optional(), email: z.string().optional() }))((data) => data.id ?? data.email)
 * const findUserById = mdf(z.number())((id) => db.users.find({ id }))
 * const findUserByEmail = mdf(z.string().email())((email) => db.users.find({ email }))
 * const findUserByIdOrEmail = branch(
 *   getIdOrEmail,
 *   (output) => (typeof output === "number" ? findUserById : findUserByEmail)
 * )
 * //    ^? DomainFunction<User>
 *
 * const getStock = mdf(z.any(), z.object({ id: z.number() }))(_, ({ id }) => db.stocks.find({ id }))
 * const getExtraStock = mdf(z.any(), z.object({ id: z.number() }))(_, ({ id }) => db.stockes.find({ id, extra: true }))
 *
 * const getStockOrExtraStock = branch(
 *  getStock,
 *  ({ items }) => (items.length >= 0 ? null : getExtraStock)
 * )
 * //   ^? DomainFunction<{ items: Item[] }>
 */
function branch<T, R extends DomainFunction | null>(
  dfn: DomainFunction<T>,
  resolver: (o: T) => Promise<R> | R,
) {
  return (async (input, environment) => {
    const result = await dfn(input, environment)
    if (!result.success) return result

    return composable(async () => {
      const nextDf = await resolver(result.data)
      if (typeof nextDf !== 'function') return result.data
      return fromSuccess(nextDf)(result.data, environment)
    })()
  }) as DomainFunction<
    R extends DomainFunction<infer U> ? U : UnpackData<NonNullable<R>> | T
  >
}

export { branch, collectSequence, pipe, sequence }
