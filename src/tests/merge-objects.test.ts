import { assertEquals, describe, it } from './prelude.ts'
import { mergeObjects } from '../index.ts'

// runtime and type tests for mergeObjects

describe('mergeObjects', () => {
  it('merges multiple objects into one', () => {
    const obj1 = { a: 1 } as const
    const obj2 = { b: 'b' } as const
    const result = mergeObjects([obj1, obj2])

    type _R = Expect<Equal<typeof result, { a: 1; b: 'b' }>>

    assertEquals(result, { a: 1, b: 'b' })
  })

  it('later objects override earlier ones', () => {
    const result = mergeObjects([{ a: 1 }, { a: 2 }])
    type _R = Expect<Equal<typeof result, { a: number }>>

    assertEquals(result, { a: 2 })
  })

  it('returns an empty object when given an empty list', () => {
    const result = mergeObjects([])
    type _R = Expect<Equal<typeof result, {}>>

    assertEquals(result, {})
  })
})
