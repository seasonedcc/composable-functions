import { assertEquals, assertIsError, describe, it, z } from './prelude.ts'
import {
  all,
  composable,
  environment,
  failure,
  InputError,
  success,
  withSchema,
} from '../../index.ts'
import { Composable } from '../../types.ts'

describe('branch', () => {
  it('should pipe a domain function with a function that returns a DF', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = environment.branch(a, () => Promise.resolve(b))
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('should enable conditionally choosing the next DF with the output of first one', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => String(id))
    const c = withSchema(z.object({ id: z.number() }))(({ id }) => id * 2)
    const d = environment.branch(a, (output) =>
      output.next === 'multiply' ? c : b,
    )
    type _R = Expect<
      Equal<
        typeof d,
        Composable<(input?: unknown, environment?: unknown) => number | string>
      >
    >

    assertEquals(await d({ id: 1 }), success(6))
  })

  it('should not pipe if the predicate returns null', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => String(id))
    const d = environment.branch(a, (output) =>
      output.next === 'multiply' ? null : b,
    )
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (
            input?: unknown,
            environment?: unknown,
          ) => string | { id: number; next: string }
        >
      >
    >

    assertEquals(await d({ id: 1 }), success({ id: 3, next: 'multiply' }))
  })

  it('should use the same environment in all composed functions', async () => {
    const a = composable((_input: unknown, { env }: { env: number }) => ({
      inp: env + 2,
    }))
    const b = composable(
      ({ inp }: { inp: number }, { env }: { env: number }) => inp + env,
    )

    const c = environment.branch(a, () => b)
    // TODO: This input should maybe be a required { inp: number }
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (input?: unknown, environment?: { env: number } | undefined) => number
        >
      >
    >

    assertEquals(await c(undefined, { env: 1 }), success(4))
  })

  it('should gracefully fail if the first function fails', async () => {
    const a = withSchema(z.number())((id) => ({
      id: id + 2,
    }))
    const b = composable((id: number) => id - 1)
    const c = environment.branch(a, () => b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(
      await c('1'),
      failure([new InputError('Expected number, received string')]),
    )
  })

  it('should gracefully fail if the second function fails', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: String(id),
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = environment.branch(a, () => b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected number, received string', ['id'])]),
    )
  })

  it('should gracefully fail if the condition function fails', async () => {
    const a = composable((id: number) => ({
      id: id + 2,
    }))
    const b = composable((id: number) => id - 1)
    const c = environment.branch(a, (_) => {
      throw new Error('condition function failed')
      // deno-lint-ignore no-unreachable
      return b
    })
    // TODO: the input should be required
    // type _R = Expect<
    //   Equal<
    //     typeof c,
    //     Composable<(input: number, environment?: unknown) => number>
    //   >
    // >

    const {
      errors: [err],
    } = await c(1)
    assertIsError(err, Error, 'condition function failed')
  })

  it('should not break composition with other combinators', async () => {
    const a = withSchema(
      z.object({ id: z.number() }),
      // TODO: Why don't we have z.any or z.unknown as default for env?
      z.unknown(),
    )(({ id }) => ({
      id: id + 2,
    }))
    const b = composable(({ id }: { id: number }) => id - 1)
    const c = composable((n: number, env: number) => env + n * 2)
    const d = all(
      environment.pipe(
        environment.branch(a, () => b),
        c,
      ),
      a,
    )
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (
            input: Partial<unknown>,
            environment: number,
          ) => [number, { id: number }]
        >
      >
    >

    assertEquals(
      await d({ id: 1 }, 3),
      success<[number, { id: number }]>([7, { id: 3 }]),
    )
  })
})
