import { assertEquals, describe, it } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { makeSuccessResult, mdf } from './constructor.ts'
import { applyEnvironment } from './domain-functions.ts'
import { makeErrorResult, EnvironmentError } from './errors.ts'

describe('applyEnvironment', () => {
  it('fails when environment fails parser', async () => {
    const getEnv = mdf(z.unknown(), z.number())((_, e) => e)

    const getEnvWithEnvironment = applyEnvironment(
      getEnv,
      'invalid environment',
    )

    assertEquals(
      await getEnvWithEnvironment('some input'),
      makeErrorResult({
        errors: [new EnvironmentError('Expected number, received string', '')],
      }),
    )
  })

  it('should apply environment', async () => {
    const getEnv = mdf(z.unknown(), z.string())((_, e) => e)

    const getEnvWithEnvironment = applyEnvironment(
      getEnv,
      'constant environment',
    )

    assertEquals(
      await getEnvWithEnvironment('some input'),
      makeSuccessResult('constant environment'),
    )
  })
})
