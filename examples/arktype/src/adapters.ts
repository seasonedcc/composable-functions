import {
  ApplySchemaReturn,
  composable,
  Composable,
  ComposableWithSchema,
  ContextError,
  failure,
  InputError,
  ParserSchema,
  UnpackData,
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
  return <R, Input, Context>(
    fn: Composable<(input: Input, context: Context) => R>,
  ) => {
    return function (input?: unknown, context?: unknown) {
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
      return fn(result as Input, ctxResult as Context)
    } as ApplySchemaReturn<I, C, typeof fn>
  }
}

function withArkSchema<I, C>(
  inputSchema?: Type<I>,
  contextSchema?: Type<C>,
): <Fn extends (input: I, context: C) => unknown>(
  fn: Fn,
) => ComposableWithSchema<UnpackData<Composable<Fn>>> {
  return (handler) =>
    applyArkSchema(
      inputSchema,
      contextSchema,
    )(composable(handler)) as ComposableWithSchema<any>
}

export { adapt, withArkSchema, applyArkSchema }
