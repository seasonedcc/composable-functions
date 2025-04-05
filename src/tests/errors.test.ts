import { assertEquals, describe, it } from './prelude.ts'
import {
  ContextError,
  InputError,
  isContextError,
  isInputError,
} from '../index.ts'

describe('isInputError', () => {
  it('checks if an error is instance of InputError', () => {
    assertEquals(isInputError(new Error('No')), false)
    assertEquals(isInputError(new InputError('Yes')), true)
    assertEquals(isInputError(new ContextError('No')), false)
  })
})

describe('isContextError', () => {
  it('checks if an error is instance of ContextError', () => {
    assertEquals(isContextError(new Error('No')), false)
    assertEquals(isContextError(new InputError('No')), false)
    assertEquals(isContextError(new ContextError('Yes')), true)
  })
})
