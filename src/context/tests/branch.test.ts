import { assertEquals, assertIsError, describe, it, z } from './prelude.ts'
import {
  all,
  composable,
  context,
  failure,
  InputError,
  success,
  withSchema,
} from '../../index.ts'
import type {
  Composable,
  ComposableWithSchema,
  UnpackData,
} from '../../types.ts'

describe('branch', () => {
  it('should pipe a composable with arbitrary types', async () => {
    const a = composable(({ id }: { id: number }, context: number) => ({
      id: id + 2 + context,
    }))
    const b = composable(
      ({ id }: { id: number }, context: number) => id - 1 + context,
    )

    const c = context.branch(a, () => Promise.resolve(b))
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input: { id: number }, context: number) => number>
      >
    >

    assertEquals(await c({ id: 1 }, 0), success(2))
  })

  it('should pipe a composable with a function that returns a composable with schema', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => id - 1)

    const c = context.branch(a, () => Promise.resolve(b))
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('should enable conditionally choosing the next composable with the output of first one', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => String(id))
    const c = withSchema(z.object({ id: z.number() }))(({ id }) => id * 2)
    const d = context.branch(a, (output) => output.next === 'multiply' ? c : b)
    type _R = Expect<Equal<typeof d, ComposableWithSchema<number | string>>>

    assertEquals(await d({ id: 1 }), success(6))
  })

  it('should not pipe if the predicate returns null', async () => {
    const a = withSchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = withSchema(z.object({ id: z.number() }))(({ id }) => String(id))
    const d = context.branch(a, (output) => {
      type _Check = Expect<Equal<typeof output, UnpackData<typeof a>>>
      return output.next === 'multiply' ? null : b
    })
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (
            input?: unknown,
            context?: unknown,
          ) => string | { id: number; next: string }
        >
      >
    >

    assertEquals(await d({ id: 1 }), success({ id: 3, next: 'multiply' }))
  })

  it('should use the same context in all composed functions', async () => {
    const a = composable((_input: unknown, { ctx }: { ctx: number }) => ({
      inp: ctx + 2,
    }))
    const b = composable(
      ({ inp }: { inp: number }, { ctx }: { ctx: number }) => inp + ctx,
    )

    const c = context.branch(a, () => b)
    type _R = Expect<
      Equal<
        typeof c,
        Composable<(input: unknown, context: { ctx: number }) => number>
      >
    >

    assertEquals(await c(undefined, { ctx: 1 }), success(4))
  })

  it('should gracefully fail if the first function fails', async () => {
    const a = withSchema(z.number())((id) => ({
      id: id + 2,
    }))
    const b = composable(({ id }: { id: number }) => id - 1)
    const c = context.branch(a, () => b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

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
    const c = context.branch(a, () => b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected number, received string', ['id'])]),
    )
  })

  it('should gracefully fail if the condition function fails', async () => {
    const a = composable((id: number) => ({
      id: id + 2,
    }))
    const b = composable(({ id }: { id: number }) => id - 1)
    const c = context.branch(a, (_) => {
      throw new Error('condition function failed')
      // deno-lint-ignore no-unreachable
      return b
    })
    const {
      errors: [err],
    } = await c(1)
    assertIsError(err, Error, 'condition function failed')
  })

  it('should not break composition with other combinators', async () => {
    const a = withSchema(
      z.object({ id: z.number() }),
    )(({ id }) => ({
      id: id + 2,
    }))
    const b = composable(({ id }: { id: number }) => id - 1)
    const c = composable((n: number, ctx: number) => ctx + n * 2)
    const d = all(
      context.pipe(
        context.branch(a, () => b),
        c,
      ),
      a,
    )
    type _R = Expect<
      Equal<
        typeof d,
        Composable<
          (input: Partial<unknown>, context: number) => [number, { id: number }]
        >
      >
    >

    assertEquals(
      await d({ id: 1 }, 3),
      success<[number, { id: number }]>([7, { id: 3 }]),
    )
  })
})
