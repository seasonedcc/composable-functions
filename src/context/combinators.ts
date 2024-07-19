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
 * import { withContext } from 'composable-functions'
 *
 * const a = (aNumber: number) => String(aNumber)
 * const b = (aString: string) => aString === '1'
 * const d = withContext.pipe(a, b)
 * //    ^? ComposableWithSchema<boolean>
 * ```
 */
function pipe<Fns extends Function[]>(
  ...fns: Fns
): PipeReturn<Internal.Composables<Fns>> {
  const callable = ((input: any, context: any) =>
    A.pipe(
      ...applyContextToList(fns as unknown as Internal.AnyFn[], context) as [
        Composable,
        ...Composable[],
      ],
    )(input)) as PipeReturn<
      Internal.Composables<Fns>
    >
  ;(callable as any).kind = 'composable' as const
  return callable
}

/**
 * Works like `withContext.pipe` but it will collect the output of every function in a tuple.
 *
 * @example
 *
 * ```ts
 * import { withContext } from 'composable-functions'
 *
 * const a = (aNumber: number) => String(aNumber)
 * const b = (aString: string) => aString === '1'
 * const aComposable = withContext.sequence(a, b)
 * //    ^? ComposableWithSchema<[string, boolean]>
 * ```
 */

function sequence<Fns extends Function[]>(
  ...fns: Fns
): SequenceReturn<Internal.Composables<Fns>> {
  const callable = ((input: any, context: any) =>
    A.sequence(
      ...applyContextToList(fns as unknown as Internal.AnyFn[], context) as [
        Composable,
        ...Composable[],
      ],
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
  SourceComposable extends Function,
  Resolver extends (
    o: UnpackData<Composable<Extract<SourceComposable, Internal.AnyFn>>>,
  ) => Internal.AnyFn | null | Promise<Internal.AnyFn | null>,
>(
  cf: SourceComposable,
  resolver: Resolver,
): SourceComposable extends Internal.AnyFn
  ? BranchReturn<Composable<SourceComposable>, Resolver>
  : never {
  const callable =
    (async (...args: Parameters<Extract<SourceComposable, Internal.AnyFn>>) => {
      const [input, context] = args
      const result = await composable(cf)(input, context)
      if (!result.success) return result

      return composable(async () => {
        const nextFn = await resolver(result.data)
        if (typeof nextFn !== 'function') return result.data
        return fromSuccess(composable(nextFn))(result.data, context)
      })()
    }) as SourceComposable extends Internal.AnyFn
      ? BranchReturn<Composable<SourceComposable>, Resolver>
      : never
  ;(callable as any).kind = 'composable' as const
  return callable
}

export { branch, pipe, sequence }
