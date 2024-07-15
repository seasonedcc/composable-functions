import { assertEquals, describe, it, z } from './prelude.ts'
import {
  applySchema,
  composable,
  context,
  ContextError,
  failure,
  InputError,
  success,
} from '../../index.ts'
import type { Composable, ComposableWithSchema } from '../../index.ts'
import type { Internal } from '../../internal/types.ts'

describe('pipe', () => {
  it('should compose functions from left-to-right', async () => {
    const a = applySchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = applySchema(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = context.pipe(a, b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('should use the same context in all composed functions', async () => {
    const a = applySchema(
      z.undefined(),
      z.object({ ctx: z.number() }),
    )((_input, { ctx }) => ({
      inp: ctx + 2,
    }))
    const b = applySchema(
      z.object({ inp: z.number() }),
      z.object({ ctx: z.number() }),
    )(({ inp }, { ctx }) => inp + ctx)

    const c = context.pipe(a, b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(await c(undefined, { ctx: 1 }), success(4))
  })

  it('should fail on the first context parser failure', async () => {
    const ctxParser = z.object({ ctx: z.number() })
    const a = applySchema(
      z.undefined(),
      ctxParser,
    )((_input, { ctx }) => ({
      inp: ctx + 2,
    }))
    const b = applySchema(
      z.object({ inp: z.number() }),
      ctxParser,
    )(({ inp }, { ctx }) => inp + ctx)

    const c = context.pipe(a, b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(
      await c(undefined, {}),
      failure([new ContextError('Required', ['ctx'])]),
    )
  })

  it('should fail on the first input parser failure', async () => {
    const firstInputParser = z.undefined()

    const a = applySchema(
      firstInputParser,
      z.object({ ctx: z.number() }),
    )((_input, { ctx }) => ({
      inp: ctx + 2,
    }))
    const b = applySchema(
      z.object({ inp: z.number() }),
      z.object({ ctx: z.number() }),
    )(({ inp }, { ctx }) => inp + ctx)

    const c = context.pipe(a, b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(
      await c({ inp: 'some invalid input' }, { ctx: 1 }),
      failure([new InputError('Expected undefined, received object')]),
    )
  })

  it('should compose mandatory contexts', async () => {
    const a = composable(() => ({ inp: 1 }))
    const b = composable(
      ({ inp }: { inp: number }, { ctx }: { ctx: number }) => inp + ctx,
    )

    const c = context.pipe(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(inp: unknown, ctx: { ctx: number }) => number>
      >
    >

    assertEquals(await c(undefined, { ctx: 1 }), success(2))
  })

  it('should compose more than 2 functions', async () => {
    const a = applySchema(z.object({ aNumber: z.number() }))(({ aNumber }) => ({
      aString: String(aNumber),
    }))
    const b = applySchema(z.object({ aString: z.string() }))(({ aString }) => ({
      aBoolean: aString == '1',
    }))
    const c = applySchema(z.object({ aBoolean: z.boolean() }))(
      ({ aBoolean }) => !aBoolean,
    )

    const d = context.pipe(a, b, c)
    type _R = Expect<Equal<typeof d, ComposableWithSchema<boolean>>>

    assertEquals(await d({ aNumber: 1 }), success(false))
  })

  it('fails to compose functions with third mandatory parameter', async () => {
    const add = composable((a: number, ctx: number) => a + ctx)
    const fn = context.pipe(
      add,
      composable((x: number, _ctx: number, _makeItFail: boolean) => x),
    )

    // @ts-expect-error composition will fail
    const _res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Internal.FailToCompose<undefined, boolean>>
    >
  })

  it('fails to compose incompatible functions', async () => {
    const add = composable((a: number, ctx: number) => a + ctx)
    const fn = context.pipe(
      add,
      composable((x: string) => x),
    )

    // @ts-expect-error composition will fail
    const _res = await fn(1, 2)

    type _FN = Expect<Equal<typeof fn, Internal.FailToCompose<number, string>>>
  })

  it('compose using context when piped functions requires a second parameter', async () => {
    const add = composable((a: number, ctx: number) => a + ctx)
    const fn = context.pipe(add, add)

    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, ctx: number) => number>>
    >
    assertEquals(res, success(5))
  })

  it('accepts plain functions', async () => {
    const add = (a: number, ctx: number) => a + ctx
    const fn = context.pipe(add, add)

    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, ctx: number) => number>>
    >
    assertEquals(res, success(5))
  })
})
