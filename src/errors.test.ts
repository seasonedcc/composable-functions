import { describe, it, expect } from 'vitest'
import * as z from 'zod'

import { formatErrors } from './errors'

describe('formatErrors', () => {
  it('takes an error result with input errors and return them', () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const body = { missingId: '1' }
    const errorResult = parser.safeParse({
      body,
    }) as z.SafeParseError<{ id: number }>

    const result = formatErrors({
      success: false,
      errors: [],
      inputErrors: errorResult.error.issues,
    })

    expect(result).toHaveProperty('inputErrors', errorResult.error.issues)
  })

  it('takes an error result with errors and return just a global error message', () => {
    const result = formatErrors({
      success: false,
      errors: [{ message: 'some error message' }],
      inputErrors: [],
    })

    expect(result).toHaveProperty('error', 'some error message')
  })
})
