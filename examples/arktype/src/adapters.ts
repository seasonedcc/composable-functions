import {
  composable,
  Composable,
  EnvironmentError,
  failure,
  InputError,
  ParserSchema,
  UnpackData,
} from 'composable-functions'
import { type, Type } from 'arktype'

/**
 * Approach 1: Adapt your schema to return a ParserSchema
 */
function adapt<T extends Type>(schema: T) {
  return {
    safeParse: (val: unknown) => {
      const result = schema(val)
      if (result.errors) {
        return {
          success: false,
          error: {
            issues: result.errors.map((e) => ({
              path: e.path as string[],
              message: e.message,
            })),
          },
        }
      }
      return {
        success: true,
        data: result.data as T['infer'],
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
) {
  return function <Output>(
    handler: (input: I, environment: E) => Output,
  ): Composable<(input?: unknown, environment?: unknown) => Awaited<Output>> {
    return applyArkSchema(inputSchema, environmentSchema)(composable(handler))
  }
}

function applyArkSchema<I, E>(
  inputSchema?: Type<I>,
  environmentSchema?: Type<E>,
) {
  return <A extends Composable>(fn: A) => {
    return async function (input: I, environment: E) {
      const envResult = (environmentSchema ?? type('unknown'))(environment)
      const result = (inputSchema ?? type('unknown'))(input)

      if (result.errors || envResult.errors) {
        const inputErrors = Array.isArray(result.errors)
          ? result.errors.map(
              (error) => new InputError(error.message, error.path as string[]),
            )
          : []
        const envErrors = Array.isArray(envResult.errors)
          ? envResult.errors.map(
              (error) =>
                new EnvironmentError(error.message, error.path as string[]),
            )
          : []
        return failure([...inputErrors, ...envErrors])
      }
      return fn(result.data as I, envResult.data as E)
    } as Composable<(input?: unknown, environment?: unknown) => UnpackData<A>>
  }
}

export { adapt, withArkSchema, applyArkSchema }
