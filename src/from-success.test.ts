import { describe, it, assertEquals, assertRejects } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { mdf } from './constructor.ts'
import { fromSuccess } from './domain-functions.ts'
import { ResultError } from './errors.ts'
import type { Equal, Expect } from './types.test.ts'

describe('fromSuccess', () => {
  it('returns the result.data when the domain function suceeds', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = fromSuccess(a)
    type _R = Expect<
      Equal<
        typeof c,
        (input?: unknown, environment?: unknown) => Promise<number>
      >
    >

    assertEquals(await c({ id: 1 }), 2)
  })

  it('throws an exception when the domain function fails', () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)

    const c = fromSuccess(a)
    type _R = Expect<
      Equal<
        typeof c,
        (input?: unknown, environment?: unknown) => Promise<number>
      >
    >

    assertRejects(async () => {
      await c({ invalidInput: 'should error' })
    }, ResultError)
  })
})
