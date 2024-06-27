import type { Composable, UnpackData } from '../types.ts'
import * as A from '../combinators.ts'
import { composable, fromSuccess } from '../constructors.ts'
import type { BranchReturn, PipeReturn, SequenceReturn } from './types.ts'
import type { Internal } from '../internal/types.ts'

function applyContextToList<
  Fns extends Array<(input: unknown, context: unknown) => unknown>,
>(fns: Fns, context: unknown) {
  return fns.map((fn) => {
    const callable = ((input) => composable(fn)(input, context)) as Composable
    callable.kind = 'composable' as const
    return callable
  }) as Composable[]
}

/**
 * Creates a single composable out of a chain of multiple functions. It will pass the same context to all given functions, and it will pass the output of a function as the next function's input in left-to-right order. The resulting data will be the output of the rightmost function.
 *
 * @example
 *
 * ```ts
 * import { withSchema, context } from 'composable-functions'
 *
 * const a = withSchema(z.object({ aNumber: z.number() }))(
 *   ({ aNumber }) => ({ aString: String(aNumber) }),
 * )
 * const b = withSchema(z.object({ aString: z.string() }))(
 *   ({ aString }) => ({ aBoolean: aString == '1' }),
 * )
 * const d = context.pipe(a, b)
 * //    ^? ComposableWithSchema<{ aBoolean: boolean }>
 * ```
 */
function pipe<Fns extends Array<(...args: any[]) => any>>(
  ...fns: Fns
): PipeReturn<Internal.Composables<Fns>> {
  const callable =
    ((input: any, context: any) =>
      A.pipe(...applyContextToList(fns, context) as [
        Composable,
        ...Composable[],
      ])(input)) as PipeReturn<
        Internal.Composables<Fns>
      >
  ;(callable as any).kind = 'composable' as const
  return callable
}

/**
 * Works like `context.pipe` but it will collect the output of every function in a tuple.
 *
 * @example
 *
 * ```ts
 * import { withSchema, context } from 'composable-functions'
 *
 * const a = withSchema(z.number())((aNumber) => String(aNumber))
 * const b = withSchema(z.string())((aString) => aString === '1')
 * const aComposable = context.sequence(a, b)
 * //    ^? ComposableWithSchema<[string, boolean]>
 * ```
 */

function sequence<Fns extends Array<(...args: any[]) => any>>(
  ...fns: Fns
): SequenceReturn<Internal.Composables<Fns>> {
  const callable = ((input: any, context: any) =>
    A.sequence(
      ...applyContextToList(fns, context) as [Composable, ...Composable[]],
    )(
      input,
    )) as SequenceReturn<Internal.Composables<Fns>>
  ;(callable as any).kind = 'composable' as const
  return callable
}

/**
 * Like branch but preserving the context parameter.
 */
function branch<
  SourceComposable extends (...args: any[]) => any,
  Resolver extends (
    o: UnpackData<Composable<SourceComposable>>,
  ) => Composable | null | Promise<Composable | null>,
>(
  cf: SourceComposable,
  // TODO: Make resolver accept plain functions
  resolver: Resolver,
): BranchReturn<Composable<SourceComposable>, Resolver> {
  const callable = (async (...args: Parameters<SourceComposable>) => {
    const [input, context] = args
    const result = await composable(cf)(input, context)
    if (!result.success) return result

    return composable(async () => {
      const nextFn = await resolver(result.data)
      if (typeof nextFn !== 'function') return result.data
      return fromSuccess(nextFn)(result.data, context)
    })()
  }) as BranchReturn<Composable<SourceComposable>, Resolver>
  ;(callable as any).kind = 'composable' as const
  return callable
}

export { branch, pipe, sequence }
