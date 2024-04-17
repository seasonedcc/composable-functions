// deno-lint-ignore-file no-namespace ban-ts-comment
import { assertEquals, describe, it } from '../../test-prelude.ts'
import { Result, Success } from '../../types.ts'
import { make } from '../index.ts'
import * as Subject from '../types.ts'

namespace UnpackData {
  const result = make()(() => ({ name: 'foo' } as const))

  type test = Expect<
    Equal<Subject.UnpackData<typeof result>, { readonly name: 'foo' }>
  >
  type error = Expect<
    // @ts-expect-error
    Equal<Subject.UnpackData<typeof result>, { name: string }>
  >
}

namespace UnpackResult {
  const result = make()(() => ({ name: 'foo' }))

  type test = Expect<
    Equal<Subject.UnpackResult<typeof result>, Result<{ name: string }>>
  >
}

namespace UnpackSuccess {
  const result = make()(() => ({ name: 'foo' }))

  type test = Expect<
    Equal<Subject.UnpackSuccess<typeof result>, Success<{ name: string }>>
  >
}

namespace UnpackAll {
  const dfA = make()(() => ({ a: 1 } as const))
  const dfB = make()(() => ({ b: 2 } as const))

  type Result = Subject.UnpackAll<[typeof dfA, typeof dfB]>

  type test = Expect<Equal<Result, [{ readonly a: 1 }, { readonly b: 2 }]>>
}

describe('type tests', () =>
  it('should have no ts errors', () => assertEquals(true, true)))
