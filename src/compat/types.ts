import { EnvironmentError, InputError } from '../errors.ts'
import { SerializableError } from '../types.ts'

type SerializedResult<T> =
  | {
      success: true
      data: T
      errors: []
      inputErrors: []
      environmentErrors: []
    }
  | {
      success: false
      errors: SerializableError[]
      inputErrors: SerializableError<InputError>[]
      environmentErrors: SerializableError<EnvironmentError>[]
    }

export type { SerializedResult }
