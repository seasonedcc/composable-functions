import { assertEquals, describe, it, z } from './prelude.ts'
import {
  composable,
  context,
  ContextError,
  failure,
  InputError,
  success,
  withSchema,
} from '../../index.ts'
import type { Composable } from '../../index.ts'

describe('sequence', () => {
  it('should compose functions from left-to-right saving the results sequentially', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      result: id - 1,
    }))

    const c = context.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (
            input?: unknown,
            context?: unknown,
          ) => [{ id: number }, { result: number }]
        >
      >
    >

    assertEquals(
      await c({ id: 1 }),
      success<[{ id: number }, { result: number }]>([{ id: 3 }, { result: 2 }]),
    )
  })

  it('should use the same context in all composed functions', async () => {
    const a = withSchema(
      z.undefined(),
      z.object({ ctx: z.number() }),
    )((_input, { ctx }) => ({
      inp: ctx + 2,
    }))
    const b = withSchema(
      z.object({ inp: z.number() }),
      z.object({ ctx: z.number() }),
    )(({ inp }, { ctx }) => ({ result: inp + ctx }))

    const c = context.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (
            input?: unknown,
            context?: unknown,
          ) => [{ inp: number }, { result: number }]
        >
      >
    >

    assertEquals(
      await c(undefined, { ctx: 1 }),
      success<[{ inp: number }, { result: number }]>([
        { inp: 3 },
        { result: 4 },
      ]),
    )
  })

  it('should fail on the first context parser failure', async () => {
    const ctxParser = z.object({ ctx: z.number() })
    const a = withSchema(
      z.undefined(),
      ctxParser,
    )((_input, { ctx }) => ({
      inp: ctx + 2,
    }))
    const b = withSchema(
      z.object({ inp: z.number() }),
      ctxParser,
    )(({ inp }, { ctx }) => inp + ctx)

    const c = context.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (input?: unknown, context?: unknown) => [{ inp: number }, number]
        >
      >
    >

    assertEquals(
      await c(undefined, {}),
      failure([new ContextError('Required', ['ctx'])]),
    )
  })

  it('should fail on the first input parser failure', async () => {
    const firstInputParser = z.undefined()

    const a = withSchema(
      firstInputParser,
      z.object({ ctx: z.number() }),
    )((_input, { ctx }) => ({
      inp: ctx + 2,
    }))
    const b = withSchema(
      z.object({ inp: z.number() }),
      z.object({ ctx: z.number() }),
    )(({ inp }, { ctx }) => inp + ctx)

    const c = context.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (input?: unknown, context?: unknown) => [{ inp: number }, number]
        >
      >
    >

    assertEquals(
      await c({ inp: 'some invalid input' }, { ctx: 1 }),
      failure([new InputError('Expected undefined, received object')]),
    )
  })

  it('should fail on the second input parser failure', async () => {
    const a = withSchema(
      z.undefined(),
      z.object({ ctx: z.number() }),
    )(() => ({
      inp: 'some invalid input',
    }))
    const b = withSchema(
      z.object({ inp: z.number() }),
      z.object({ ctx: z.number() }),
    )(({ inp }, { ctx }) => inp + ctx)

    const c = context.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (input?: unknown, context?: unknown) => [{ inp: string }, number]
        >
      >
    >

    assertEquals(
      await c(undefined, { ctx: 1 }),
      failure([new InputError('Expected number, received string', ['inp'])]),
    )
  })

  it('should compose more than 2 functions', async () => {
    const a = withSchema(z.object({ aNumber: z.number() }))(({ aNumber }) => ({
      aString: String(aNumber),
    }))
    const b = withSchema(z.object({ aString: z.string() }))(({ aString }) => ({
      aBoolean: aString == '1',
    }))
    const c = withSchema(z.object({ aBoolean: z.boolean() }))(
      ({ aBoolean }) => ({
        anotherBoolean: !aBoolean,
      }),
    )

    const d = context.sequence(a, b, c)
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (
            input?: unknown,
            context?: unknown,
          ) => [
            { aString: string },
            { aBoolean: boolean },
            { anotherBoolean: boolean },
          ]
        >
      >
    >

    assertEquals(
      await d({ aNumber: 1 }),
      success<
        [
          { aString: string },
          { aBoolean: boolean },
          { anotherBoolean: boolean },
        ]
      >([{ aString: '1' }, { aBoolean: true }, { anotherBoolean: false }]),
    )
  })

  it('should properly type the context', async () => {
    const a = composable((a: number, b: number) => a + b)
    const b = composable((a: number, b: number) => `${a} + ${b}`)
    const c = context.sequence(a, b)
    type _R = Expect<
      Equal<typeof c, Composable<(a: number, b: number) => [number, string]>>
    >

    assertEquals(await c(1, 2), success<[number, string]>([3, '3 + 2']))
  })

  it('accepts plain functions', async () => {
    const a = (a: number, b: number) => a + b
    const b = (a: number, b: number) => `${a} + ${b}`
    const c = context.sequence(a, b)
    type _R = Expect<
      Equal<typeof c, Composable<(a: number, b: number) => [number, string]>>
    >

    assertEquals(await c(1, 2), success<[number, string]>([3, '3 + 2']))
  })
})
