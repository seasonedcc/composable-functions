import {
  describe,
  it,
  assertObjectMatch,
  assertEquals,
} from './test-prelude.ts'
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'

import { mdf } from './constructor.ts'
import { collect } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('collect', () => {
  it('should combine an object of domain functions', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: number }>>>

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: { a: 2, b: 0 },
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.string() }))(({ id }) => id)

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: string }>>>

    assertEquals(await c({ id: 1 }), {
      success: false,
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      errors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.number() }))(() => {
      throw new Error('Error')
    })

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: number; b: never }>>>

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = mdf(z.object({ id: z.string() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.string() }))(({ id }) => id)

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: string; b: string }>>>

    assertEquals(await c({ id: 1 }), {
      success: false,
      inputErrors: [
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
        {
          message: 'Expected string, received number',
          path: ['id'],
        },
      ],
      environmentErrors: [],
      errors: [],
    })
  })

  it('should combine the error messages when both functions fail', async () => {
    const a = mdf(z.object({ id: z.number() }))(() => {
      throw new Error('Error A')
    })
    const b = mdf(z.object({ id: z.number() }))(() => {
      throw new Error('Error B')
    })

    const c = collect({ a, b })
    type _R = Expect<Equal<typeof c, DomainFunction<{ a: never; b: never }>>>

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [
        { message: 'Error A', exception: { message: 'Error A' } },
        { message: 'Error B', exception: { message: 'Error B' } },
      ],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})
