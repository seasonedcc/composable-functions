import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import {
  assertEquals,
  assertObjectMatch,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { z } from 'npm:zod@3.21.4'

import { makeDomainFunction } from './constructor.ts'
import { merge } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('merge', () => {
  it('should combine two domain functions results into one object', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      resultA: id + 1,
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      resultB: id - 1,
    }))

    const c = merge(a, b)
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ resultA: number; resultB: number }>>
    >

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: { resultA: 2, resultB: 0 },
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine many domain functions into one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      resultA: String(id),
      resultB: String(id),
      resultC: String(id),
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      resultB: id + 1,
    }))
    const c = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      resultC: Boolean(id),
    }))
    const d = merge(a, b, c)
    type _R = Expect<
      Equal<
        typeof d,
        DomainFunction<{
          resultA: string
          resultB: number
          resultC: boolean
        }>
      >
    >

    const results = await d({ id: 1 })
    assertEquals(results, {
      success: true,
      data: {
        resultA: '1',
        resultB: 2,
        resultC: true,
      },
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id,
    }))
    const b = makeDomainFunction(z.object({ id: z.string() }))(({ id }) => ({
      id,
    }))

    const c: DomainFunction<{ id: string }> = merge(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        DomainFunction<{
          id: string
        }>
      >
    >

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
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id,
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c: DomainFunction<never> = merge(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<never>>>

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = makeDomainFunction(z.object({ id: z.string() }))(({ id }) => ({
      resultA: id,
    }))
    const b = makeDomainFunction(z.object({ id: z.string() }))(({ id }) => ({
      resultB: id,
    }))

    const c = merge(a, b)
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ resultA: string; resultB: string }>>
    >

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
    const a = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw new Error('Error A')
    })
    const b = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw new Error('Error B')
    })

    const c = merge(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<never>>>

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

  it('should throw an error when the results of some domain functions are not objects', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id + 1,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      resultB: id - 1,
    }))

    // @ts-expect-error - DF a is not DomainFunction<Record<string, unknown>>
    const c = merge(a, b)

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [
        { message: 'Invalid data format returned from some domainFunction' },
      ],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})
