import {
  assertEquals,
  assertIsError,
  describe,
  it,
  z,
} from '../../test-prelude.ts'
import { df, failure, InputError, success } from '../../index.ts'
import { Composable } from '../../types.ts'

describe('branch', () => {
  it('should pipe a domain function with a function that returns a DF', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = df.branch(a, () => Promise.resolve(b))
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('should enable conditionally choosing the next DF with the output of first one', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => String(id))
    const c = df.make(z.object({ id: z.number() }))(({ id }) => id * 2)
    const d = df.branch(a, (output) => (output.next === 'multiply' ? c : b))
    type _R = Expect<
      Equal<
        typeof d,
        Composable<(input?: unknown, environment?: unknown) => number | string>
      >
    >

    assertEquals(await d({ id: 1 }), success(6))
  })

  it('should not pipe if the predicate returns null', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => String(id))
    const d = df.branch(a, (output) => (output.next === 'multiply' ? null : b))
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
    const a = df.make(
      z.undefined(),
      z.object({ env: z.number() }),
    )((_input, { env }) => ({
      inp: env + 2,
    }))
    const b = df.make(
      z.object({ inp: z.number() }),
      z.object({ env: z.number() }),
    )(({ inp }, { env }) => inp + env)

    const c = df.branch(a, () => b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input?: unknown, environment?: unknown) => number>
      >
    >

    assertEquals(await c(undefined, { env: 1 }), success(4))
  })

  it('should gracefully fail if the first function fails', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = df.branch(a, () => b)
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
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      id: String(id),
    }))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = df.branch(a, () => b)
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
    const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = df.make(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = df.branch(a, (_) => {
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

  // TODO: FIX THIS
  // it('should not break composition with other combinators', async () => {
  //   const a = df.make(z.object({ id: z.number() }))(({ id }) => ({
  //     id: id + 2,
  //   }))
  //   const b = df.make(z.object({ id: z.number() }))(({ id }) => id - 1)
  //   const c = df.make(z.number())((n) => n * 2)
  //   const d = all(
  //     df.pipe(
  //       df.branch(a, () => b),
  //       c,
  //     ),
  //     a,
  //   )
  //   type _R = Expect<Equal<typeof d, Composable<(input?: unknown, environment?: unknown) => [number, { id: number }]>>>

  //   assertEquals(
  //     await d({ id: 1 }),
  //     success<[number, { id: number }]>([4, { id: 3 }]),
  //   )
  // })
})
