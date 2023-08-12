import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { z } from 'npm:zod@3.21.4'

import { makeDomainFunction } from './constructor.ts'
import { pipe } from './domain-functions.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('pipe', () => {
  it('should compose domain functions from left-to-right', async () => {
    const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = makeDomainFunction(z.object({ id: z.number() }))(
      ({ id }) => id - 1,
    )

    const c = pipe(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: 2,
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

    const c = pipe(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c(undefined, { env: 1 }), {
      success: true,
      data: 4,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('should fail on the first environment parser failure', async () => {
    const envParser = z.object({ env: z.number() })
    const a = makeDomainFunction(
      z.undefined(),
      envParser,
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      envParser,
    )(({ inp }, { env }) => inp + env)

    const c = pipe(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c(undefined, {}), {
      success: false,
      errors: [],
      inputErrors: [],
      environmentErrors: [{ message: 'Required', path: ['env'] }],
    })
  })

  it('should fail on the first input parser failure', async () => {
    const firstInputParser = z.undefined()

    const a = makeDomainFunction(
      firstInputParser,
      z.object({ env: z.number() }),
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = pipe(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ inp: 'some invalid input' }, { env: 1 }), {
      success: false,
      errors: [],
      inputErrors: [
        { message: 'Expected undefined, received object', path: [] },
      ],
      environmentErrors: [],
    })
  })

  it('should fail on the second input parser failure', async () => {
    const a = makeDomainFunction(
      z.undefined(),
      z.object({ env: z.number() }),
    )(() => ({
      inp: 'some invalid input',
    }))
    const b = makeDomainFunction(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = pipe(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c(undefined, { env: 1 }), {
      success: false,
      errors: [],
      inputErrors: [
        { message: 'Expected number, received string', path: ['inp'] },
      ],
      environmentErrors: [],
    })
  })

  it('should compose more than 2 functions', async () => {
    const a = makeDomainFunction(z.object({ aNumber: z.number() }))(
      ({ aNumber }) => ({
        aString: String(aNumber),
      }),
    )
    const b = makeDomainFunction(z.object({ aString: z.string() }))(
      ({ aString }) => ({
        aBoolean: aString == '1',
      }),
    )
    const c = makeDomainFunction(z.object({ aBoolean: z.boolean() }))(
      ({ aBoolean }) => !aBoolean,
    )

    const d = pipe(a, b, c)
    type _R = Expect<Equal<typeof d, DomainFunction<boolean>>>

    assertEquals(await d({ aNumber: 1 }), {
      success: true,
      data: false,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})
