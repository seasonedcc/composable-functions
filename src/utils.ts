import type {
  ParserIssue,
  Result,
  SchemaError,
  SuccessResult,
} from './types.ts'

function formatSchemaErrors(errors: ParserIssue[]): SchemaError[] {
  return errors.map((error) => {
    const { path, message } = error
    return { path: path.map(String), message }
  })
}

function isListOfSuccess<T>(result: Result<T>[]): result is SuccessResult<T>[] {
  return result.every(({ success }) => success === true)
}

export { mergeObjects } from 'npm:composable-functions@beta'
export { formatSchemaErrors, isListOfSuccess }
