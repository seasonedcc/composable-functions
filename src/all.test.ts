import {
  describe,
  it,
  assertEquals,
  assertObjectMatch,
} from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { makeSuccessResult, mdf } from './constructor.ts'
import { all } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { makeErrorResult } from './errors.ts'

describe('all', () => {
  it('should combine two domain functions into one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, number]>>>

    assertEquals(
      await c({ id: 1 }),
      makeSuccessResult<[number, number]>([2, 0]),
    )
  })

  it('should combine many domain functions into one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => String(id))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const c = mdf(z.object({ id: z.number() }))(({ id }) => Boolean(id))
    const d = all(a, b, c)
    type _R = Expect<Equal<typeof d, DomainFunction<[string, number, boolean]>>>

    const results = await d({ id: 1 })
    assertEquals(
      results,
      makeSuccessResult<[string, number, boolean]>(['1', 2, true]),
    )
  })

  it('should return error when one of the domain functions has input errors', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, string]>>>

    assertEquals(
      await c({ id: 1 }),
      makeErrorResult({
        inputErrors: [
          { message: 'Expected string, received number', path: ['id'] },
        ],
      }),
    )
  })

  it('should return error when one of the domain functions fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.number() }))(() => {
      throw 'Error'
    })

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[number, never]>>>

    assertEquals(
      await c({ id: 1 }),
      makeErrorResult({
        errors: [{ message: 'Error', exception: 'Error' }],
      }),
    )
  })

  it('should combine the inputError messages of both functions', async () => {
    const a = mdf(z.object({ id: z.string() }))(({ id }) => id)
    const b = mdf(z.object({ id: z.string() }))(({ id }) => id)

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[string, string]>>>

    assertEquals(
      await c({ id: 1 }),
      makeErrorResult({
        inputErrors: [
          { message: 'Expected string, received number', path: ['id'] },
          { message: 'Expected string, received number', path: ['id'] },
        ],
      }),
    )
  })

  it('should combine the error messages when both functions fail', async () => {
    const a = mdf(z.object({ id: z.number() }))(() => {
      throw new Error('Error A')
    })
    const b = mdf(z.object({ id: z.number() }))(() => {
      throw new Error('Error B')
    })

    const c = all(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<[never, never]>>>

    assertObjectMatch(
      await c({ id: 1 }),
      makeErrorResult({
        errors: [{ message: 'Error A' }, { message: 'Error B' }],
      }),
    )
  })
})
