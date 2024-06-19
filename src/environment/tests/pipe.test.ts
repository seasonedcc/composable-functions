import { assertEquals, describe, it, z } from './prelude.ts'
import {
  composable,
  environment,
  EnvironmentError,
  failure,
  InputError,
  success,
  withSchema,
} from '../../index.ts'
import type { Composable, ComposableWithSchema } from '../../index.ts'
import type { Internal } from '../../internal/types.ts'

describe('pipe', () => {
  it('should compose functions from left-to-right', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = environment.pipe(a, b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('should use the same environment in all composed functions', async () => {
    const a = withSchema(
      z.undefined(),
      z.object({ env: z.number() }),
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = withSchema(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = environment.pipe(a, b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(await c(undefined, { env: 1 }), success(4))
  })

  it('should fail on the first environment parser failure', async () => {
    const envParser = z.object({ env: z.number() })
    const a = withSchema(
      z.undefined(),
      envParser,
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = withSchema(
      z.object({ inp: z.number() }),
      envParser,
    )(({ inp }, { env }) => inp + env)

    const c = environment.pipe(a, b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(
      await c(undefined, {}),
      failure([new EnvironmentError('Required', ['env'])]),
    )
  })

  it('should fail on the first input parser failure', async () => {
    const firstInputParser = z.undefined()

    const a = withSchema(
      firstInputParser,
      z.object({ env: z.number() }),
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = withSchema(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = environment.pipe(a, b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(
      await c({ inp: 'some invalid input' }, { env: 1 }),
      failure([new InputError('Expected undefined, received object')]),
    )
  })

  it('should compose mandatory environments', async () => {
    const a = composable(() => ({ inp: 1 }))
    const b = composable(
      ({ inp }: { inp: number }, { env }: { env: number }) => inp + env,
    )

    const c = environment.pipe(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(inp: unknown, env: { env: number }) => number>
      >
    >

    assertEquals(await c(undefined, { env: 1 }), success(2))
  })

  it('should compose more than 2 functions', async () => {
    const a = withSchema(z.object({ aNumber: z.number() }))(({ aNumber }) => ({
      aString: String(aNumber),
    }))
    const b = withSchema(z.object({ aString: z.string() }))(({ aString }) => ({
      aBoolean: aString == '1',
    }))
    const c = withSchema(z.object({ aBoolean: z.boolean() }))(
      ({ aBoolean }) => !aBoolean,
    )

    const d = environment.pipe(a, b, c)
    type _R = Expect<Equal<typeof d, ComposableWithSchema<boolean>>>

    assertEquals(await d({ aNumber: 1 }), success(false))
  })

  it('fails to compose functions with third mandatory parameter', async () => {
    const add = composable((a: number, env: number) => a + env)
    const fn = environment.pipe(
      add,
      composable((x: number, env: number, makeItFail: boolean) => x),
    )

    // @ts-expect-error composition will fail
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Internal.FailToCompose<undefined, boolean>>
    >
  })

  it('fails to compose incompatible functions', async () => {
    const add = composable((a: number, env: number) => a + env)
    const fn = environment.pipe(
      add,
      composable((x: string) => x),
    )

    // @ts-expect-error composition will fail
    const res = await fn(1, 2)

    type _FN = Expect<Equal<typeof fn, Internal.FailToCompose<number, string>>>
  })

  it('compose using environment when piped functions requires a second parameter', async () => {
    const add = composable((a: number, env: number) => a + env)
    const fn = environment.pipe(add, add)

    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, env: number) => number>>
    >
    assertEquals(res, success(5))
  })
})
