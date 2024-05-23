import { assertEquals, describe, it, z } from './prelude.ts'
import type { Composable, Result } from '../index.ts'
import { composable, tap, success } from '../index.ts'
import { withSchema } from '../index.ts'

const toString = composable((a: unknown) => `${a}`)
const schemaAdd = withSchema(z.number(), z.number())((a, b) => a + b)
const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})

describe('tap', () => {
  it('runs the composition in sequence but keeping the same input for every composable', async () => {
    const fn = tap(schemaAdd, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<
        typeof fn,
        // TODO: Fix this weird type signature
        Composable<(a: Partial<unknown>, b?: unknown) => [number, string]>
      >
    >
    type _R = Expect<Equal<typeof res, Result<[number, string]>>>

    assertEquals(res, success<[number, string]>([3, '1']))
  })

  it('catches the errors from function A', async () => {
    const fn = tap(faultyAdd, toString)
    const res = await fn(1, 2)

    type _FN = Expect<
      Equal<typeof fn, Composable<(a: number, b: number) => [number, string]>>
    >
    type _R = Expect<Equal<typeof res, Result<[number, string]>>>

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'a is 1')
  })

  it('does not allow composition of incompatible functions', async () => {
    const fn = tap(
      composable((a: number, b: number) => a + b),
      composable((a: string) => {
        if (typeof a !== 'string') {
          throw new Error('Expected string, received number')
        }
        return a + '!'
      }),
    )
    // @ts-expect-error: Arguments are incompatible
    const res = await fn(1, 2)

    assertEquals(res.success, false)
    assertEquals(res.errors[0].message, 'Expected string, received number')
  })
})
