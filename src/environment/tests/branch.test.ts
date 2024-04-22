import { assertEquals, assertIsError, describe, it, z } from './prelude.ts'
import {
  all,
  composable,
  environment,
  withSchema,
  failure,
  InputError,
  success,
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

    const c = environment.branch(a, () => b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(await c(undefined, { env: 1 }), success(4))
  })

  it('should gracefully fail if the first function fails', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
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
      await c({ id: '1' }),
      failure([new InputError('Expected number, received string', ['id'])]),
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
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = environment.branch(a, (_) => {
      throw new Error('condition function failed')
      // deno-lint-ignore no-unreachable
      return b
    })
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    const {
      errors: [err],
    } = await c({ id: 1 })
    assertIsError(err, Error, 'condition function failed')
  })

  it('should not break composition with other combinators', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = composable(({ id }: { id: number }) => id - 1)
    const c = composable((n: number) => n * 2)
    const dfPipe = environment.pipe(
      environment.branch(a, () => b),
      c,
    )
    const d = all(dfPipe, a)
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (input?: unknown, environment?: unknown) => [number, { id: number }]
        >
      >
    >

    assertEquals(
      await d({ id: 1 }),
      success<[number, { id: number }]>([4, { id: 3 }]),
    )
  })
})
