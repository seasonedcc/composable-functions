import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import {
  assertEquals,
  assertObjectMatch,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { z } from 'https://deno.land/x/zod@v3.19.1/mod.ts'

import { makeDomainFunction } from './constructor.ts'
import { all, strict } from './domain-functions.ts'
import type { DomainFunction, StrictDomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('all', () => {
  it('should combine two domain functions into one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id + 1,
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id - 1,
    )

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, number]>>>

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: [2, 0],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine many domain functions into one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) =>
      String(id),
    )
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id + 1,
    )
    const c = makeDomainFunction(z.object({ id: z.number() }))(({ id }) =>
      Boolean(id),
    )
    const d = all(a, b, c)
    type _R = Expect<Equal<typeof d, DomainFunction<[string, number, boolean]>>>

    const results = await d({ id: 1 })
    assertEquals(results, {
      success: true,
      data: ['1', 2, true],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => id)
    const b = makeDomainFunction(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, string]>>>

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
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => id)
    const b = makeDomainFunction(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, never]>>>

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error', exception: 'Error' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = makeDomainFunction(z.object({ id: z.string() }))(({ id }) => id)
    const b = makeDomainFunction(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[string, string]>>>

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

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[never, never]>>>

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'Error A' }, { message: 'Error B' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('does not type check when input intersection is never on strict version', () => {
    const a = makeDomainFunction(
      z.object({ id: z.number() }),
      z.string(),
    )(({ id }) => String(id))
    const b = makeDomainFunction(
      z.object({ id: z.string() }),
      z.string(),
    )(({ id }) => id + 1)
    const d = strict(all(a, b))

    type _R = Expect<
      Equal<
        typeof d,
        StrictDomainFunction<[string, string], { id: never }, string>
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
    const d = strict(all(a, b, c))

    type _R = Expect<
      Equal<
        typeof d,
        StrictDomainFunction<[string, number, boolean], { id: number }, string>
      >
    >

    //@ts-expect-error: The code below does not type check since our environment parser won't take a number
    let results = await d({ id: 1 }, 1)

    results = await d({ id: 1 }, 'proper environment for parser')
    assertEquals(results, {
      success: true,
      data: ['1', 2, true],
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})
