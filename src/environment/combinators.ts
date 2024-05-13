import type { Composable } from '../types.ts'
import * as A from '../combinators.ts'
import { composable, fromSuccess } from '../constructors.ts'
import { BranchReturn, PipeReturn, SequenceReturn } from './types.ts'

function applyEnvironmentToList<
  Fns extends Array<(input: unknown, environment: unknown) => unknown>,
>(fns: Fns, environment: unknown) {
  return fns.map((fn) => (input) => fn(input, environment)) as [Composable]
}

/**
 * Creates a single composable out of a chain of multiple functions. It will pass the same environment to all given functions, and it will pass the output of a function as the next function's input in left-to-right order. The resulting data will be the output of the rightmost function.
 *
 * @example
 *
 * ```ts
 * import { withSchema, environment } from 'composable-functions'
 *
 * const a = withSchema(z.object({ aNumber: z.number() }))(
 *   ({ aNumber }) => ({ aString: String(aNumber) }),
 * )
 * const b = withSchema(z.object({ aString: z.string() }))(
 *   ({ aString }) => ({ aBoolean: aString == '1' }),
 * )
 * const d = environment.pipe(a, b)
 * //    ^? Composable<(input?: unknown, environment?: unknown) => { aBoolean: boolean }>
 * ```
 */
function pipe<Fns extends Composable[]>(...fns: Fns) {
  return ((input: any, environment: any) =>
    A.pipe(...applyEnvironmentToList(fns, environment))(
      input,
    )) as PipeReturn<Fns>
}

/**
 * Works like `environment.pipe` but it will collect the output of every function in a tuple.
 *
 * @example
 *
 * ```ts
 * import { withSchema, environment } from 'composable-functions'
 *
 * const a = withSchema(z.number())((aNumber) => String(aNumber))
 * const b = withSchema(z.string())((aString) => aString === '1')
 * const aComposable = environment.sequence(a, b)
 * //    ^? Composable<(input?: unknown, environment?: unknown) => [string, boolean]>
 * ```
 */

function sequence<Fns extends Composable[]>(...fns: Fns) {
  return ((input: any, environment: any) =>
    A.sequence(...applyEnvironmentToList(fns, environment))(
      input,
    )) as SequenceReturn<Fns>
}

/**
 * Like branch but preserving the environment parameter.
 */
function branch<
  SourceComposable extends Composable,
  Resolver extends (
    ...args: any[]
  ) => Composable | null | Promise<Composable | null>,
>(cf: SourceComposable, resolver: Resolver) {
  return (async (...args: Parameters<SourceComposable>) => {
    const [input, environment] = args
    const result = await cf(input, environment)
    if (!result.success) return result

    return composable(async () => {
      const nextDf = await resolver(result.data)
      if (typeof nextDf !== 'function') return result.data
      return fromSuccess(nextDf)(result.data, environment)
    })()
  }) as BranchReturn<SourceComposable, Resolver>
}

export { branch, pipe, sequence }
