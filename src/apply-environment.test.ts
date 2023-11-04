import { assertEquals, describe, it } from './test-prelude.ts'
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import { mdf } from './constructor.ts'
import { applyEnvironment } from './domain-functions.ts'

describe('applyEnvironment', () => {
  it('should apply environment', async () => {
    const getEnv = mdf(z.unknown(), z.string())((_, e) => e)

    const getEnvWithEnvironment = applyEnvironment(
      getEnv,
      'constant environment',
    )

    assertEquals(await getEnvWithEnvironment('some input'), {
      success: true,
      data: 'constant environment',
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})

