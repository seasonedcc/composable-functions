import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import {
  assertEquals,
  assertRejects,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { z } from 'npm:zod@3.21.4'

import { makeDomainFunction } from './constructor.ts'
import { fromSuccess } from './domain-functions.ts'
import { ResultError } from './errors.ts'
import type { Equal, Expect } from './types.test.ts'

describe('fromSuccess', () => {
  it('returns the result.data when the domain function suceeds', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id + 1,
    )

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
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id + 1,
    )

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
