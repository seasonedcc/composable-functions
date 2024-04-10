// deno-lint-ignore-file ban-ts-comment no-namespace no-unused-vars
import { mdf } from './constructor.ts'
import { assertEquals, describe, it } from './test-prelude.ts'
import * as Subject from './types.ts'

export type Expect<T extends true> = T
export type Equal<A, B> =
  // prettier is removing the parens thus worsening readability
  // prettier-ignore
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true
    : [A, "should equal", B]

namespace UnpackData {
  const result = mdf()(() => ({ name: 'foo' } as const))

  type test = Expect<
    Equal<Subject.UnpackData<typeof result>, { readonly name: 'foo' }>
  >
  type error = Expect<
    // @ts-expect-error
    Equal<Subject.UnpackData<typeof result>, { name: string }>
  >
}

namespace UnpackResult {
  const result = mdf()(() => ({ name: 'foo' }))

  type test = Expect<
    Equal<Subject.UnpackResult<typeof result>, Subject.Result<{ name: string }>>
  >
}

namespace UnpackSuccess {
  const result = mdf()(() => ({ name: 'foo' }))

  type test = Expect<
    Equal<
      Subject.UnpackSuccess<typeof result>,
      Subject.SuccessResult<{ name: string }>
    >
  >
}

namespace MergeObjs {
  const obj1 = { a: 1, b: 2 } as const
  const obj2 = {}
  const obj3 = { c: 3, d: 4 } as const

  type Result = Subject.MergeObjs<[typeof obj1, typeof obj2, typeof obj3]>

  type test1 = Expect<Equal<keyof Result, 'a' | 'b' | 'c' | 'd'>>
  type test2 = Expect<Equal<Result[keyof Result], 1 | 2 | 3 | 4>>
}

namespace TupleToUnion {
  type Result = Subject.TupleToUnion<[1, 2, 3]>

  type test = Expect<Equal<Result, 1 | 2 | 3>>
}

namespace Last {
  type test1 = Expect<Equal<Subject.Last<[1, 2, 3]>, 3>>
  type test2 = Expect<Equal<Subject.Last<[1]>, 1>>
  type test3 = Expect<Equal<Subject.Last<[]>, never>>
}

namespace AtLeastOne {
  type Result = Subject.AtLeastOne<{ a: 1; b: 2 }>

  const test1: Result = { a: 1 }
  const test2: Result = { b: 2 }
  const test3: Result = { a: 1, b: 2 }
  // @ts-expect-error
  const error1: Result = {}
  // @ts-expect-error
  const error2: Result = { a: 1, c: 3 }
}

namespace UnpackAll {
  const dfA = mdf()(() => ({ a: 1 } as const))
  const dfB = mdf()(() => ({ b: 2 } as const))

  type Result = Subject.UnpackAll<[typeof dfA, typeof dfB]>

  type test = Expect<Equal<Result, [{ readonly a: 1 }, { readonly b: 2 }]>>
}

namespace MergeObjs {
  const obj1 = { a: 1, b: 2 } as const
  const obj2 = {}
  const obj3 = { c: 3, d: 4 } as const

  type Result = Subject.MergeObjs<[typeof obj1, typeof obj2, typeof obj3]>

  type test1 = Expect<Equal<keyof Result, 'a' | 'b' | 'c' | 'd'>>
  type test2 = Expect<Equal<Result[keyof Result], 1 | 2 | 3 | 4>>
}

namespace TupleToUnion {
  type Result = Subject.TupleToUnion<[1, 2, 3]>

  type test = Expect<Equal<Result, 1 | 2 | 3>>
}

namespace Last {
  type test1 = Expect<Equal<Subject.Last<[1, 2, 3]>, 3>>
  type test2 = Expect<Equal<Subject.Last<[1]>, 1>>
  type test3 = Expect<Equal<Subject.Last<[]>, never>>
}

namespace Prettify {
  type test1 = Expect<
    Equal<
      Subject.Prettify<{ a: number } & { b: string }>,
      { a: number; b: string }
    >
  >
  type error1 = Expect<
    // @ts-expect-error
    Equal<
      Subject.Prettify<{ a: number } & { b: string }>,
      { a: number } & { b: string }
    >
  >
}

namespace AtLeastOne {
  type Result = Subject.AtLeastOne<{ a: 1; b: 2 }>

  const test1: Result = { a: 1 }
  const test2: Result = { b: 2 }
  const test3: Result = { a: 1, b: 2 }
  // @ts-expect-error
  const error1: Result = {}
  // @ts-expect-error
  const error2: Result = { a: 1, c: 3 }
}

describe('type tests', () =>
  it('should have no ts errors', () => assertEquals(true, true)))
