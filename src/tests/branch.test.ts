import {
  applySchema,
  branch,
  composable,
  failure,
  InputError,
  success,
} from '../index.ts'
import type {
  Composable,
  ComposableWithSchema,
  Result,
  UnpackData,
} from '../types.ts'
import { assertEquals, assertIsError, describe, it, z } from './prelude.ts'

describe('branch', () => {
  it('should pipe a composable with arbitrary types', async () => {
    const a = ({ id }: { id: number }) => ({
      id: id + 2,
    })
    const b = composable(({ id }: { id: number }) => id - 1)

    const c = branch(a, () => Promise.resolve(b))
    type _R = Expect<
      Equal<typeof c, Composable<(input: { id: number }) => number>>
    >

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('accepts plain resolver functions', async () => {
    const a = ({ id }: { id: number }) => ({
      id: id + 2,
    })
    const b = ({ id }: { id: number }) => id - 1

    const c = branch(a, () => Promise.resolve(b))
    type _R = Expect<
      Equal<typeof c, Composable<(input: { id: number }) => number>>
    >

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('accepts plain functions', async () => {
    const a = (a: number, b: number) => a + b
    const b = (a: number) => String(a - 1)
    const fn = branch(a, (a) => a === 3 ? b : null)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => number | string>>
    >
    type _R = Expect<Equal<typeof res, Result<number | string>>>

    assertEquals(res, success('2'))
  })

  it('should enable conditionally choosing the next Composable with the output of first one', async () => {
    const a = composable((id: number) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = composable(({ id }: { id: number }) => String(id))
    const c = composable(({ id }: { id: number }) => id * 2)
    const d = branch(a, (output) => (output.next === 'multiply' ? c : b))
    type _R = Expect<
      Equal<typeof d, Composable<(a: number) => number | string>>
    >

    assertEquals(await d(1), success(6))
  })

  it('should not pipe if the predicate returns null', async () => {
    const a = applySchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
      next: 'multiply',
    }))
    const b = composable(({ id }: { id: number }) => String(id))
    const c = branch(a, (output) => {
      type _Check = Expect<Equal<typeof output, UnpackData<typeof a>>>
      return output.next === 'multiply' ? null : b
    })
    type _R = Expect<
      Equal<
        typeof c,
        Composable<
          (
            input?: unknown,
            context?: unknown,
          ) => string | { id: number; next: string }
        >
      >
    >

    assertEquals(await c({ id: 1 }), success({ id: 3, next: 'multiply' }))
  })

  it('should gracefully fail if the first function fails', async () => {
    const a = applySchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = composable(({ id }: { id: number }) => id - 1)
    const c = branch(a, () => b)
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    assertEquals(
      await c({ id: '1' }),
      failure([new InputError('Expected number, received string', ['id'])]),
    )
  })

  it('should gracefully fail if the second function fails', async () => {
    const a = composable(({ id }: { id: number }) => ({
      id: String(id),
    }))
    const b = applySchema(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = branch(a, () => b)
    type _R = Expect<Equal<typeof c, Composable<(a: { id: number }) => number>>>

    assertEquals(
      await c({ id: 1 }),
      failure([new InputError('Expected number, received string', ['id'])]),
    )
  })

  it('should gracefully fail if the condition function fails', async () => {
    const a = applySchema(z.object({ id: z.number() }))(({ id }) => ({
      id: id + 2,
    }))
    const b = applySchema(z.object({ id: z.number() }))(({ id }) => id - 1)
    const c = branch(a, (_) => {
      throw new Error('condition function failed')
      // deno-lint-ignore no-unreachable
      return b
    })
    type _R = Expect<Equal<typeof c, ComposableWithSchema<number>>>

    const {
      errors: [err],
    } = await c({ id: 1 })
    assertIsError(err, Error, 'condition function failed')
  })
})
