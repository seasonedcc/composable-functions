import {
  describe,
  it,
  assertEquals,
  assertObjectMatch,
} from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { makeSuccessResult, mdf } from './constructor.ts'
import { branch, pipe, all } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { makeErrorResult } from './errors.ts'
import { ErrorWithMessage } from './types.ts'

describe('branch', () => {
  it('should pipe a domain function with a function that returns a DF', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = branch(a, () => Promise.resolve(b))
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), makeSuccessResult(2))
  })

  it('should enable conditionally choosing the next DF with the output of first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => String(id))
    const c = mdf(z.object({ id: z.number() }))(({ id }) => id * 2)
    const d = branch(a, (output) => (output.next === 'multiply' ? c : b))
    type _R = Expect<Equal<typeof d, DomainFunction<number | string>>>

    assertEquals(await d({ id: 1 }), makeSuccessResult(6))
  })

  it('should not pipe if the predicate returns null', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => String(id))
    const d = branch(a, (output) => (output.next === 'multiply' ? null : b))
    type _R = Expect<
      Equal<typeof d, DomainFunction<string | { id: number; next: string }>>
    >

    assertEquals(
      await d({ id: 1 }),
      makeSuccessResult({ id: 3, next: 'multiply' }),
    )
  })

  it('should use the same environment in all composed functions', async () => {
    const a = mdf(
      z.undefined(),
      z.object({ env: z.number() }),
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = mdf(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = branch(a, () => b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c(undefined, { env: 1 }), makeSuccessResult(4))
  })

  it('should gracefully fail if the first function fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = branch(a, () => b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ id: '1' }),
      makeErrorResult({
        inputErrors: [
          { path: ['id'], message: 'Expected number, received string' },
        ],
      }),
    )
  })

  it('should gracefully fail if the second function fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => ({
      id: String(id),
    }))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = branch(a, () => b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ id: 1 }),
      makeErrorResult({
        inputErrors: [
          { path: ['id'], message: 'Expected number, received string' },
        ],
      }),
    )
  })

  it('should gracefully fail if the condition function fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = branch(a, (_) => {
      throw new Error('condition function failed')
      // deno-lint-ignore no-unreachable
      return b
    })
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertObjectMatch(
      await c({ id: 1 }),
      makeErrorResult({
        errors: [
          { message: 'condition function failed' },
        ] as ErrorWithMessage[],
      }),
    )
  })

  it('should not break composition with other combinators', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = mdf(z.number())((n) => n * 2)
    const d = all(
      pipe(
        branch(a, () => b),
        c,
      ),
      a,
    )
    type _R = Expect<Equal<typeof d, DomainFunction<[number, { id: number }]>>>

    assertEquals(
      await d({ id: 1 }),
      makeSuccessResult<[number, { id: number }]>([4, { id: 3 }]),
    )
  })
})
