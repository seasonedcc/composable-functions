// deno-lint-ignore-file ban-ts-comment no-namespace
import { describe, it, assertEquals } from './test-prelude.ts'
import * as subject from './utils.ts'
import type { Result, SuccessResult } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

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
