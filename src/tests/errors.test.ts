import { assertEquals, describe, it } from './prelude.ts'
import {
  ContextError,
  EnvironmentError,
  InputError,
  isContextError,
  isEnvironmentError,
  isInputError,
} from '../index.ts'

describe('isInputError', () => {
  it('checks if an error is instance of InputError', () => {
    assertEquals(isInputError(new Error('No')), false)
    assertEquals(isInputError(new InputError('Yes')), true)
    assertEquals(isInputError(new ContextError('No')), false)
    assertEquals(isInputError(new EnvironmentError('No')), false)
  })
})

describe('isContextError', () => {
  it('checks if an error is instance of ContextError', () => {
    assertEquals(isContextError(new Error('No')), false)
    assertEquals(isContextError(new InputError('No')), false)
    assertEquals(isContextError(new ContextError('Yes')), true)
    assertEquals(isContextError(new EnvironmentError('Yes')), true)
  })

  it('checks if an error is instance of legacy EnvironmentError', () => {
    assertEquals(isEnvironmentError(new Error('No')), false)
    assertEquals(isEnvironmentError(new InputError('No')), false)
    assertEquals(isEnvironmentError(new ContextError('Yes')), true)
    assertEquals(isEnvironmentError(new EnvironmentError('Yes')), true)
  })
})
