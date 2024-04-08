import { describe, it, assertEquals } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { makeSuccessResult, mdf } from './constructor.ts'
import { collectSequence } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { makeErrorResult } from './errors.ts'

describe('collectSequence', () => {
  it('should compose domain functions keeping the given order of keys', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = mdf(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = collectSequence({ a, b })
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ a: { id: number }; b: number }>>
    >

    assertEquals(await c({ id: 1 }), makeSuccessResult({ a: { id: 3 }, b: 2 }))
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

    const c = collectSequence({ a, b })
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ a: { inp: number }; b: number }>>
    >

    assertEquals(
      await c(undefined, { env: 1 }),
      makeSuccessResult({ a: { inp: 3 }, b: 4 }),
    )
  })

  it('should fail on the first environment parser failure', async () => {
    const envParser = z.object({ env: z.number() })
    const a = mdf(
      z.undefined(),
      envParser,
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = mdf(
      z.object({ inp: z.number() }),
      envParser,
    )(({ inp }, { env }) => inp + env)

    const c = collectSequence({ a, b })
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ a: { inp: number }; b: number }>>
    >

    assertEquals(
      await c(undefined, {}),
      makeErrorResult({
        environmentErrors: [{ message: 'Required', path: ['env'] }],
      }),
    )
  })

  it('should fail on the first input parser failure', async () => {
    const firstInputParser = z.undefined()

    const a = mdf(
      firstInputParser,
      z.object({ env: z.number() }),
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = mdf(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = collectSequence({ a, b })
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ a: { inp: number }; b: number }>>
    >

    assertEquals(
      await c({ inp: 'some invalid input' }, { env: 1 }),
      makeErrorResult({
        inputErrors: [
          { message: 'Expected undefined, received object', path: [] },
        ],
      }),
    )
  })

  it('should fail on the second input parser failure', async () => {
    const a = mdf(
      z.undefined(),
      z.object({ env: z.number() }),
    )(() => ({
      inp: 'some invalid input',
    }))
    const b = mdf(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = collectSequence({ a, b })
    type _R = Expect<
      Equal<typeof c, DomainFunction<{ a: { inp: string }; b: number }>>
    >

    assertEquals(
      await c(undefined, { env: 1 }),
      makeErrorResult({
        inputErrors: [
          { message: 'Expected number, received string', path: ['inp'] },
        ],
      }),
    )
  })

  it('should compose more than 2 functions', async () => {
    const a = mdf(z.object({ aNumber: z.number() }))(({ aNumber }) => ({
      aString: String(aNumber),
    }))
    const b = mdf(z.object({ aString: z.string() }))(({ aString }) => ({
      aBoolean: aString == '1',
    }))
    const c = mdf(z.object({ aBoolean: z.boolean() }))(
      ({ aBoolean }) => !aBoolean,
    )

    const d = collectSequence({ a, b, c })
    type _R = Expect<
      Equal<
        typeof d,
        DomainFunction<{
          a: { aString: string }
          b: { aBoolean: boolean }
          c: boolean
        }>
      >
    >

    assertEquals(
      await d({ aNumber: 1 }),
      makeSuccessResult({
        a: { aString: '1' },
        b: { aBoolean: true },
        c: false,
      }),
    )
  })
})
