import { mapErrors } from './combinators.ts'
import { ContextError, ErrorList, InputError } from './errors.ts'
import type { Internal } from './internal/types.ts'
import type {
  ApplySchemaReturn,
  Composable,
  ComposableWithSchema,
  Failure,
  ParserSchema,
  Success,
  UnpackData,
} from './types.ts'

/**
 * It receives any data (T) and returns a Success<T> object.
 */
function success<const T>(data: T): Success<T> {
  return { success: true, data, errors: [] }
}

/**
 * It receives a list of errors and returns a Failure object.
 */
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
function composable<T extends Function>(
  fn: T,
): Composable<T extends Internal.AnyFn ? T : never> {
  if ('kind' in fn && fn.kind === 'composable') {
    return fn as unknown as Composable<
      T extends Internal.AnyFn ? T : never
    >
  }
  const callable = async (...args: any[]) => {
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
  callable.kind = 'composable' as const
  return callable as Composable<T extends Internal.AnyFn ? T : never>
}

/**
 * It can be used to call a composable from another composable. It will return the output of the given function if it was successfull, otherwise it will throw a `ErrorList` that will bubble up to the parent function.
 * Also good to use it in successfull test cases.
 * @example
 * ```ts
 * import { composable, fromSuccess } from 'composable-functions'
 *
 * const add1 = composable((n: number) => n + 1)
 * const result = await add1(1)
 * //    ^? Result<number>
 * const data = await fromSuccess(add1)(n)
 * //    ^? number
 * expect(data).toBe(n + 1)
 * ```
 */
function fromSuccess<O, P extends any[]>(
  fn: Composable<(...a: P) => O>,
  onError: (errors: Error[]) => Error[] | Promise<Error[]> = (e) => e,
): (...args: P) => Promise<O> {
  return (async (...args: P) => {
    const result = await mapErrors(fn, onError)(...args)
    if (result.success) return result.data

    throw new ErrorList(result.errors)
  }) as (...args: P) => Promise<O>
}

/**
 * Takes a composable and creates a composable withSchema that will assert the input and context types according to the given schemas.
 * @param fn a composable function
 * @param inputSchema the schema for the input
 * @param contextSchema the schema for the context
 * @returns a composable function that will assert the input and context types at runtime.
 * @example
 * ```ts
 * const safeFunction = applySchema(
 *  z.object({ greeting: z.string() }),
 *  z.object({
 *    user: z.object({ name: z.string() })
 *  }),
 * )
 * const fn = safeFunction(composable((
 *  { greeting }: { greeting: string },
 *  { user }: { user: { name: string } },
 * ) => ({
 *   message: `${greeting} ${user.name}`
 * })))
 * ```
 */
function applySchema<ParsedInput, ParsedContext>(
  inputSchema?: ParserSchema<ParsedInput>,
  contextSchema?: ParserSchema<ParsedContext>,
) {
  // TODO: Accept plain functions and equalize with withSchema
  return <R, Input, Context>(
    fn: Composable<(input: Input, context: Context) => R>,
  ): ApplySchemaReturn<ParsedInput, ParsedContext, typeof fn> => {
    const callable = ((input?: unknown, context?: unknown) => {
      const ctxResult = (contextSchema ?? alwaysUnknownSchema).safeParse(
        context,
      )
      const result = (inputSchema ?? alwaysUnknownSchema).safeParse(input)

      if (!result.success || !ctxResult.success) {
        const inputErrors = result.success ? [] : result.error.issues.map(
          (error) => new InputError(error.message, error.path as string[]),
        )
        const ctxErrors = ctxResult.success ? [] : ctxResult.error.issues.map(
          (error) => new ContextError(error.message, error.path as string[]),
        )
        return Promise.resolve(failure([...inputErrors, ...ctxErrors]))
      }
      return fn(result.data as Input, ctxResult.data as Context)
    }) as ApplySchemaReturn<ParsedInput, ParsedContext, typeof fn>
    ;(callable as any).kind = 'composable' as const
    return callable
  }
}

/**
 * Creates a composable with unknown input and context that uses schemas to parse them into known types.
 * This allows you to code the function with arbitrary types knowinng that they will be enforced in runtime.
 * Very useful when piping data coming from any external source into your composables.
 * After giving the input and context schemas, you can pass a handler function that takes type safe input and context. That function is gonna catch any errors and always return a Result.
 * @param inputSchema the schema for the input
 * @param contextSchema the schema for the context
 * @returns a handler function that takes type safe input and context
 * @example
 * const safeFunction = withSchema(
 *  z.object({ greeting: z.string() }),
 *  z.object({
 *    user: z.object({ name: z.string() })
 *  }),
 * )
 * const safeGreet = safeFunction(({ greeting }, { user }) => ({
 *   message: `${greeting} ${user.name}`
 * })
 */
function withSchema<I, C>(
  inputSchema?: ParserSchema<I>,
  contextSchema?: ParserSchema<C>,
): <Fn extends (input: I, context: C) => unknown>(
  fn: Fn,
) => ComposableWithSchema<UnpackData<Composable<Fn>>> {
  return (handler) =>
    applySchema(
      inputSchema,
      contextSchema,
    )(composable(handler)) as ComposableWithSchema<any>
}

const alwaysUnknownSchema: ParserSchema<unknown> = {
  safeParse: (data: unknown) => ({ success: true, data }),
}

export { applySchema, composable, failure, fromSuccess, success, withSchema }
