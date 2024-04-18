import { assertEquals, describe, it, z } from '../../test-prelude.ts'
import {
  df,
  EnvironmentError,
  failure,
  InputError,
  success,
  withSchema,
} from '../../index.ts'
import type { Composable } from '../../index.ts'

describe('sequence', () => {
  it('should compose domain functions from left-to-right saving the results sequentially', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      result: id - 1,
    }))

    const c = df.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (
            input?: unknown,
            environment?: unknown,
          ) => [{ id: number }, { result: number }]
        >
      >
    >

    assertEquals(
      await c({ id: 1 }),
      success<[{ id: number }, { result: number }]>([{ id: 3 }, { result: 2 }]),
    )
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
    )(({ inp }, { env }) => ({ result: inp + env }))

    const c = df.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (
            input?: unknown,
            environment?: unknown,
          ) => [{ inp: number }, { result: number }]
        >
      >
    >

    assertEquals(
      await c(undefined, { env: 1 }),
      success<[{ inp: number }, { result: number }]>([
        { inp: 3 },
        { result: 4 },
      ]),
    )
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

    const c = df.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (input?: unknown, environment?: unknown) => [{ inp: number }, number]
        >
      >
    >

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

    const c = df.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (input?: unknown, environment?: unknown) => [{ inp: number }, number]
        >
      >
    >

    assertEquals(
      await c({ inp: 'some invalid input' }, { env: 1 }),
      failure([new InputError('Expected undefined, received object')]),
    )
  })

  it('should fail on the second input parser failure', async () => {
    const a = withSchema(
      z.undefined(),
      z.object({ env: z.number() }),
    )(() => ({
      inp: 'some invalid input',
    }))
    const b = withSchema(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = df.sequence(a, b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (input?: unknown, environment?: unknown) => [{ inp: string }, number]
        >
      >
    >

    assertEquals(
      await c(undefined, { env: 1 }),
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

    const d = df.sequence(a, b, c)
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (
            input?: unknown,
            environment?: unknown,
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
})
