import { assertEquals, describe, it, z } from './prelude.ts'
import {
  environment,
  EnvironmentError,
  failure,
  success,
  withSchema,
} from '../../index.ts'

describe('applyEnvironment', () => {
  it('fails when environment fails parser', async () => {
    const getEnv = withSchema(z.unknown(), z.number())((_, e) => e)

    const getEnvWithEnvironment = environment.applyEnvironment(
      getEnv,
      'invalid environment',
    )

    assertEquals(
      await getEnvWithEnvironment('some input'),
      failure([new EnvironmentError('Expected number, received string')]),
    )
  })

  it('should apply environment', async () => {
    const getEnv = withSchema(z.unknown(), z.string())((_, e) => e)

    const getEnvWithEnvironment = environment.applyEnvironment(
      getEnv,
      'constant environment',
    )

    assertEquals(
      await getEnvWithEnvironment('some input'),
      success('constant environment'),
    )
  })
})
