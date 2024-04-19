import {
  composable,
  Composable,
  EnvironmentError,
  failure,
  InputError,
  UnpackData,
} from 'composable-functions'
import { type, Type } from 'arktype'

const objectSchema = type('unknown')
const alwaysUndefinedSchema = type('any', '=>', () => undefined)

function withArkSchema<I, E>(
  inputSchema?: Type<I>,
  environmentSchema?: Type<E>,
) {
  return function <Output>(
    handler: (input: I, environment: E) => Output,
  ): Composable<(input?: unknown, environment?: unknown) => Awaited<Output>> {
    return applyArkSchema(composable(handler), inputSchema, environmentSchema)
  }
}

function applyArkSchema<I, E, A extends Composable>(
  fn: A,
  inputSchema?: Type<I>,
  environmentSchema?: Type<E>,
): Composable<(input?: unknown, environment?: unknown) => UnpackData<A>> {
  return async function (input, environment = {}) {
    const envResult = (environmentSchema ?? objectSchema)(environment)
    const result = (inputSchema ?? alwaysUndefinedSchema)(input)

    if (!result.data || !envResult.data) {
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
    return fn(result.data, envResult.data)
  }
}

export { withArkSchema, applyArkSchema }
