import { assertEquals, describe, it } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { makeSuccessResult, mdf } from './constructor.ts'
import { mapError } from './domain-functions.ts'
import type { DomainFunction, ErrorData } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { makeErrorResult } from './errors.ts'
import { ErrorWithMessage } from './types.ts'

describe('mapError', () => {
  it('returns the result when the domain function suceeds', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () =>
      ({
        errors: [{ message: 'New Error Message' }],
        inputErrors: [{ message: 'New Input Error Message' }],
      } as ErrorData)

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), makeSuccessResult(2))
  })

  it('returns a domain function function that will apply a function over the error of the first one', async () => {
    const exception = new Error('Number of errors: 0')
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (result: ErrorData) =>
      ({
        errors: [exception],
        environmentErrors: [],
        inputErrors: [
          {
            message: 'Number of input errors: ' + result.inputErrors.length,
            path: [],
          },
        ],
      } as ErrorData)

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      makeErrorResult({
        errors: [exception],
        inputErrors: [{ message: 'Number of input errors: 1', path: [] }],
      }),
    )
  })

  it('returns a domain function function that will apply an async function over the error of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (result: ErrorData) =>
      Promise.resolve({
        errors: [
          { message: 'Number of errors: ' + result.errors.length },
        ] as ErrorWithMessage[],
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

    assertEquals(
      await c({ invalidInput: '1' }),
      makeErrorResult({
        errors: [{ message: 'Number of errors: 0' }] as ErrorWithMessage[],
        inputErrors: [{ message: 'Number of input errors: 1', path: [] }],
      }),
    )
  })

  it('returns the error when the mapping function fails', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => {
      throw 'failed to map'
    }

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      makeErrorResult({
        errors: [new Error('failed to map')],
      }),
    )
  })
})
