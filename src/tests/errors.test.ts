import { assertEquals, describe, it } from './prelude.ts'
import {
  isInputError,
  isEnvironmentError,
  isGeneralError,
  InputError,
  EnvironmentError,
} from '../index.ts'

describe('isInputError', () => {
  it('checks if an error is instance of InputError', () => {
    assertEquals(isInputError(new Error('No')), false)
    assertEquals(isInputError(new InputError('Yes')), true)
    assertEquals(isInputError(new EnvironmentError('No')), false)
  })
})

describe('isEnvironmentError', () => {
  it('checks if an error is instance of EnvironmentError', () => {
    assertEquals(isEnvironmentError(new Error('No')), false)
    assertEquals(isEnvironmentError(new InputError('No')), false)
    assertEquals(isEnvironmentError(new EnvironmentError('Yes')), true)
  })
})

describe('isGeneralError', () => {
  it('checks if an error is a general error', () => {
    class CustomError extends Error {}

    assertEquals(isGeneralError(new Error('Yes')), true)
    assertEquals(isGeneralError(new InputError('No')), false)
    assertEquals(isGeneralError(new EnvironmentError('No')), false)
    assertEquals(isGeneralError(new CustomError('Yes')), true)
  })
})
