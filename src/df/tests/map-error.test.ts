import { assertEquals, describe, it, z } from '../../test-prelude.ts'
import { df, failure, success } from '../../index.ts'
import type { DomainFunction } from '../../index.ts'

describe('mapError', () => {
  it('returns the result when the domain function suceeds', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => [new Error('New Error Message')]

    const c = df.mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), success(2))
  })

  it('returns a domain function function that will apply a function over the error of the first one', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const errorMapper = (errors: Error[]) => [
      new Error('Number of errors: ' + errors.length),
    ]

    const c = df.mapError(a, errorMapper)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      failure([new Error('Number of errors: 1')]),
    )
  })

  it('returns a domain function function that will apply an async function over the error of the first one', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const errorMapper = (errors: Error[]) =>
      Promise.resolve([new Error('Number of errors: ' + errors.length)])

    const c = df.mapError(a, errorMapper)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      failure([new Error('Number of errors: 1')]),
    )
  })

  it('returns the error when the mapping function fails', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => {
      throw 'failed to map'
    }

    const c = df.mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      failure([new Error('failed to map')]),
    )
  })
})
