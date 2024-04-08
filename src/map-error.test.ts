import { assertEquals, describe, it } from './test-prelude.ts'
import { z } from './test-prelude.ts'

import { makeSuccessResult, mdf } from './constructor.ts'
import { mapError } from './domain-functions.ts'
import type { DomainFunction, ErrorData } from './types.ts'
import type { Equal, Expect } from './types.test.ts'
import { makeErrorResult } from './errors.ts'
import { ErrorResult, InputError } from '../mod.ts'

describe('mapError', () => {
  it('returns the result when the domain function suceeds', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = () => ({
      errors: [new Error('New Error Message')],
    })

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(await c({ id: 1 }), makeSuccessResult(2))
  })

  it('returns a domain function function that will apply a function over the error of the first one', async () => {
    const exception = new Error('Number of errors: 0')
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (result: Pick<ErrorResult, 'errors'>) => {
      const nonInputErrors = result.errors.filter(
        (e) => !(e instanceof InputError),
      )
      const inputErrors = result.errors.filter((e) => e instanceof InputError)
      return {
        errors: [
          nonInputErrors,
          new InputError('Number of input errors: ' + inputErrors.length, ''),
        ],
      } as Pick<ErrorData, 'errors'>
    }

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      makeErrorResult({
        errors: [exception, new InputError('Number of input errors: 1', '')],
      }),
    )
  })

  it('returns a domain function function that will apply an async function over the error of the first one', async () => {
    const a = mdf(z.object({ id: z.number() }))(({ id }) => id + 1)
    const b = (result: Pick<ErrorResult, 'errors'>) =>
      Promise.resolve({
        errors: [new Error('Number of errors: ' + result.errors.length)],
      })

    const c = mapError(a, b)
    type _R = Expect<Equal<typeof c, DomainFunction<number>>>

    assertEquals(
      await c({ invalidInput: '1' }),
      makeErrorResult({
        errors: [
          new Error('Number of errors: 0'),
          new InputError('Number of input errors: 1', ''),
        ],
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
