import { assertEquals, describe, it } from './test-prelude.ts'
import * as v from 'npm:valibot'
import * as y from 'npm:yup'
import { Type as TypeBox } from 'npm:@sinclair/typebox'
import * as s from 'npm:superstruct'
import * as r from 'npm:runtypes'

import { makeDomainFunction } from './constructor.ts'
import type { DomainFunction } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('makeDomainFunction', () => {
  describe('when using different libraries to create schemas', () => {
    it('can use a superstruct schema', async () => {
      const schema = s.object({ id: s.number() })

      const handler = makeDomainFunction(schema)(({ id }) => id)
      type _R = Expect<Equal<typeof handler, DomainFunction<number>>>

      assertEquals(await handler({ id: 1 }), {
        success: true,
        data: 1,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
      })
    })

    it('can use a runtypes schema', async () => {
      const schema = r.Record({ id: r.Number })

      const handler = makeDomainFunction(schema)(({ id }) => id)
      type _R = Expect<Equal<typeof handler, DomainFunction<number>>>

      assertEquals(await handler({ id: 1 }), {
        success: true,
        data: 1,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
      })
    })

    it('can use a typebox schema', async () => {
      const schema = TypeBox.Object({ id: TypeBox.Integer() })

      const handler = makeDomainFunction(schema)(({ id }) => id)
      type _R = Expect<Equal<typeof handler, DomainFunction<number>>>

      assertEquals(await handler({ id: 1 }), {
        success: true,
        data: 1,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
      })
    })

    it('can use a valibot schema', async () => {
      const schema = v.object({ id: v.number() })

      const handler = makeDomainFunction(schema)(({ id }) => id)
      type _R = Expect<Equal<typeof handler, DomainFunction<number>>>

      assertEquals(await handler({ id: 1 }), {
        success: true,
        data: 1,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
      })
    })

    it('can use a yup schema', async () => {
      const schema = y.object({ id: y.number() })

      const handler = makeDomainFunction(schema)(({ id }) => id)
      type _R = Expect<
        Equal<typeof handler, DomainFunction<number | undefined>>
      >

      assertEquals(await handler({ id: 1 }), {
        success: true,
        data: 1,
        errors: [],
        inputErrors: [],
        environmentErrors: [],
      })
    })
  })
})
