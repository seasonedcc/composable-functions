import {
  composable,
  Composable,
  ComposableWithSchema,
  EnvironmentError,
  failure,
  InputError,
  ParserSchema,
} from 'composable-functions'
import { type, Type } from 'arktype'

/**
 * Approach 1: Adapt your schema to return a ParserSchema
 */
function adapt<U, T extends Type<U>>(schema: T) {
  return {
    safeParse: (val: unknown) => {
      const result = schema(val)
      if (result instanceof type.errors) {
        return {
          success: false,
          error: {
            issues: result.map((e) => ({
              path: e.path as string[],
              message: e.message,
            })),
          },
        }
      }
      return {
        success: true,
        data: result,
      }
    },
  } as ParserSchema<T['infer']>
}

/**
 * Approach 2: Create your custom `withSchema` and `applySchema` functions that will return a `Result`
 */
function withArkSchema<I, E>(
  inputSchema?: Type<I>,
  environmentSchema?: Type<E>,
): <Output>(
  handler: (input: I, environment: E) => Output,
) => ComposableWithSchema<Output> {
  return (handler) =>
    applyArkSchema(inputSchema, environmentSchema)(composable(handler))
}

function applyArkSchema<I, E>(
  inputSchema?: Type<I>,
  environmentSchema?: Type<E>,
) {
  return <R, Input, Environment>(
    fn: Composable<(input?: Input, environment?: Environment) => R>,
  ) => {
    return function (input: I, environment: E) {
      const envResult = (environmentSchema ?? type('unknown'))(environment)
      const result = (inputSchema ?? type('unknown'))(input)

      if (result instanceof type.errors || envResult instanceof type.errors) {
        const inputErrors =
          result instanceof type.errors
            ? result.map(
                (error) =>
                  new InputError(error.message, error.path as string[]),
              )
            : []
        const envErrors =
          envResult instanceof type.errors
            ? envResult.map(
                (error) =>
                  new EnvironmentError(error.message, error.path as string[]),
              )
            : []
        return failure([...inputErrors, ...envErrors])
      }
      return fn(result as Input, envResult as Environment)
    } as ComposableWithSchema<R>
  }
}

export { adapt, withArkSchema, applyArkSchema }
