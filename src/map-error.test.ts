import { describe, it, assertEquals } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { mdf } from './constructor.ts'
import { mapError } from './domain-functions.ts'
import type { DomainFunction, ErrorData } from './types.ts'
import type { Equal, Expect } from './types.test.ts'

describe('mapError', () => {
  it('returns the result when the domain function suceeds', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () =>
      ({
        errors: [{ message: 'New Error Message' }],
        inputErrors: [{ message: 'New Input Error Message' }],
      }) as ErrorData

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), {
      success: true,
      data: 2,
      errors: [],
      inputErrors: [],
      environmentErrors: [],
    })
  })

  it('returns a domain function function that will apply a function over the error of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (result: ErrorData) =>
      ({
        errors: [{ message: 'Number of errors: ' + result.errors.length }],
        environmentErrors: [],
        inputErrors: [
          {
            message: 'Number of input errors: ' + result.inputErrors.length,
            path: [],
          },
        ],
      }) as ErrorData

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ invalidInput: '1' }), {
      success: false,
      errors: [{ message: 'Number of errors: 0' }],
      environmentErrors: [],
      inputErrors: [{ message: 'Number of input errors: 1', path: [] }],
    })
  })

  it('returns a domain function function that will apply an async function over the error of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (result: ErrorData) =>
      Promise.resolve({
        errors: [{ message: 'Number of errors: ' + result.errors.length }],
        environmentErrors: [],
        inputErrors: [
          {
            message: 'Number of input errors: ' + result.inputErrors.length,
            path: [],
          },
        ],
      }) as Promise<ErrorData>

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ invalidInput: '1' }), {
      success: false,
      errors: [{ message: 'Number of errors: 0' }],
      environmentErrors: [],
      inputErrors: [{ message: 'Number of input errors: 1', path: [] }],
    })
  })

  it('returns the error when the mapping function fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => {
      throw 'failed to map'
    }

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ invalidInput: '1' }), {
      success: false,
      errors: [{ message: 'failed to map', exception: 'failed to map' }],
      inputErrors: [],
      environmentErrors: [],
    })
  })
})
