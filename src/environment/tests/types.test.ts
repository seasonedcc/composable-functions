// deno-lint-ignore-file no-namespace
import { assertEquals, describe, it } from '../../test-prelude.ts'
import { withSchema } from '../../index.ts'
import * as Subject from '../types.ts'

namespace UnpackAll {
  const dfA = withSchema()(() => ({ a: 1 } as const))
  const dfB = withSchema()(() => ({ b: 2 } as const))

  type Result = Subject.UnpackAll<[typeof dfA, typeof dfB]>

  type test = Expect<Equal<Result, [{ readonly a: 1 }, { readonly b: 2 }]>>
}

describe('type tests', () =>
  it('should have no ts errors', () => assertEquals(true, true)))
