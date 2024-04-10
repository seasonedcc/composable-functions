import { assertEquals, describe, it, z } from '../../test-prelude.ts'
import { df, failure, InputError, success } from '../../index.ts'
import type { DomainFunction } from '../../index.ts'

describe('map', () => {
  it('returns a domain function function that will apply a function over the results of the first one', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (id: number) => id + 1

    const c = df.map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), success(3))
  })

  it('returns a domain function function that will apply an async function over the results of the first one', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (id: number) => Promise.resolve(id + 1)

    const c = df.map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), success(3))
  })

  it('returns the error when the domain function fails', async () => {
    const firstInputParser = z.object({ id: z.number() })
    const a = df.make(firstInputParser)(({ id }) => id + 1)
    const b = (id: number) => id + 1

    const c = df.map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      failure([new InputError('Required', ['id'])]),
    )
  })

  it('returns the error when the mapping function fails', async () => {
    const a = df.make(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => {
      throw 'failed to map'
    }

    const c = df.map(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<never>>>

    assertEquals(await c({ id: 1 }), failure([new Error('failed to map')]))
  })
})
