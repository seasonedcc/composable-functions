import { describe, it, assertEquals, assertObjectMatch } from './test-prelude.ts'
import { z } from 'npm:zod@3.21.4'

import { makeDomainFunction } from './constructor.ts'
import { branch, pipe, all } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('branch', () => {
  it('should pipe a domain function with a function that returns a DF', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id - 1,
    )

    const c = branch(a, () => Promise.resolve(b))
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: 2,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should enable conditionally choosing the next DF with the output of first one', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(({ id }) =>
      String(id),
    )
    const c = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id * 2,
    )
    const d = branch(a, (output) => (output.next === 'multiply' ? c : b))
    type _R = Expect<Equal<typeof d, DomainFunction<number | string>>>

    assertEquals(await d({ id: 1 }), {
      success: true,
      data: 6,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should use the same environment in all composed functions', async () => {
    const a = makeDomainFunction(
      z.undefined(),
      z.object({ env: z.number() }),
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = branch(a, () => b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c(undefined, { env: 1 }), {
      success: true,
      data: 4,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should gracefully fail if the first function fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id - 1,
    )
    const c = branch(a, () => b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: '1' }), {
      success: false,
      errors: [],
      inputErrors: [
        {
          path: ['id'],
          message: 'Expected number, received string',
        },
      ],
      environmentErrors: [],
    })
  })

  it('should gracefully fail if the second function fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id: String(id),
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id - 1,
    )
    const c = branch(a, () => b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), {
      success: false,
      errors: [],
      inputErrors: [
        {
          path: ['id'],
          message: 'Expected number, received string',
        },
      ],
      environmentErrors: [],
    })
  })

  it('should gracefully fail if the condition function fails', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id - 1,
    )
    const c = branch(a, (_) => {
      throw new Error('condition function failed')
      return b
    })
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertObjectMatch(await c({ id: 1 }), {
      success: false,
      errors: [{ message: 'condition function failed' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should not break composition with other combinators', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id - 1,
    )
    const c = makeDomainFunction(z.number())((n) => n * 2)
    const d = all(
      pipe(
        branch(a, () => b),
        c,
      ),
      a,
    )
    type _R = Expect<Equal<typeof d, DomainFunction<[number, { id: number }]>>>

    assertEquals(await d({ id: 1 }), {
      data: [4, { id: 3 }],
      success: true,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})
