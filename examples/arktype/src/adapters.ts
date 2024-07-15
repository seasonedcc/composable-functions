import {
  ApplySchemaReturn,
  composable,
  ContextError,
  failure,
  InputError,
  ParserSchema,
} from 'composable-functions'
import { type, Type } from 'arktype'

/**
 * Approach 1: Adapt your schema to return a ParserSchema
 */
function adapt<T extends Type>(schema: T): ParserSchema<T['infer']> {
  return {
    safeParse: (val: unknown) => {
      const data = schema(val)
      if (data instanceof type.errors) {
        return { success: false, error: { issues: data } }
      }
      return { success: true, data }
    },
  }
}

/**
 * Approach 2: Create your custom `withSchema` and `applySchema` functions that will return a `Result`
 */
function applyArkSchema<I, C>(inputSchema?: Type<I>, contextSchema?: Type<C>) {
  //
  return <R, Input extends I, Context extends C>(
    fn: (input: Input, context: Context) => R,
  ) => {
    const callable = ((input?: unknown, context?: unknown) => {
      const ctxResult = (contextSchema ?? type('unknown'))(context)
      const result = (inputSchema ?? type('unknown'))(input)

      if (result instanceof type.errors || ctxResult instanceof type.errors) {
        const inputErrors =
          result instanceof type.errors
            ? result.map(
                (error) =>
                  new InputError(error.message, error.path as string[]),
              )
            : []
        const ctxErrors =
          ctxResult instanceof type.errors
            ? ctxResult.map(
                (error) =>
                  new ContextError(error.message, error.path as string[]),
              )
            : []
        return failure([...inputErrors, ...ctxErrors])
      }
      return composable(fn)(result as Input, ctxResult as Context)
    }) as ApplySchemaReturn<I, C, typeof fn>
    ;(callable as any).kind = 'composable' as const
    return callable
  }
}

export { adapt, applyArkSchema }
