import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import {
  assertEquals,
  assertObjectMatch,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { z } from 'https://deno.land/x/zod@v3.19.1/mod.ts'

import { makeDomainFunction } from '../constructor.ts'
import { collect } from '../domain-functions.ts'
import { strict } from './index.ts'
import type { StrictDomainFunction } from './index.ts'
import type { Equal, Expect } from '../types.test.ts'

describe('collect', () => {
  it('does not type check when input intersection is never on strict version', () => {
    const a = makeDomainFunction(
      z.object({ id: z.number() }),
      z.string(),
    )(({ id }) => String(id))
    const b = makeDomainFunction(
      z.object({ id: z.string() }),
      z.string(),
    )(({ id }) => id + 1)
    const d = strict(collect({ a, b }))

    type _R = Expect<
      Equal<
        typeof d,
        StrictDomainFunction<{ a: string; b: string }, { id: never }, string>
      >
    >

    //@ts-expect-error: The code below does not type check since our combination of inputs can never be parsed
    d({ id: 1 }, 'the environment type checks')
  })

  it('should derive proper types for strict version', async () => {
    const a = makeDomainFunction(
      z.object({ id: z.number() }),
      z.string(),
    )(({ id }) => String(id))
    const b = makeDomainFunction(
      z.object({ id: z.number() }),
      z.string(),
    )(({ id }) => id + 1)
    const c = makeDomainFunction(
      z.object({ id: z.number() }),
      z.string(),
    )(({ id }) => Boolean(id))
    const d = strict(collect({ a, b, c }))

    type _R = Expect<
      Equal<
        typeof d,
        StrictDomainFunction<
          { a: string; b: number; c: boolean },
          { id: number },
          string
        >
      >
    >

    //@ts-expect-error: The code below does not type check since our environment parser won't take a number
    let results = await d({ id: 1 }, 1)

    results = await d({ id: 1 }, 'proper environment for parser')
    assertEquals(results, {
      success: true,
      data: { a: '1', b: 2, c: true },
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})
