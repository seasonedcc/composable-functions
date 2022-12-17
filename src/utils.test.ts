// deno-lint-ignore-file ban-ts-comment no-namespace
import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import * as subject from './utils.ts'
import { Result, SuccessResult } from './types.ts'

type Expect<T extends true> = T
type Equal<A, B> =
  // prettier is removing the parens thus worsening readability
  // prettier-ignore
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false

namespace isListOfSuccess {
  const results = [
    {
      success: true,
      data: true,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    } as Result<boolean>,
  ]
  if (!subject.isListOfSuccess(results)) throw new Error('failing test')

  type test = Expect<Equal<typeof results, SuccessResult<boolean>[]>>
  // @ts-expect-error
  type error = Expect<Equal<typeof results, Result<boolean>[]>>
}

describe('util tests', () =>
  it('should have no ts errors', () => assertEquals(true, true)))
