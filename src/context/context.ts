import { branch, pipe, sequence } from './index.ts'

/**
 * @deprecated use `import { withContext } from 'composable-functions'` instead
 */
const context = {
  branch,
  pipe,
  sequence,
}

// deno-lint-ignore verbatim-module-syntax
export { context }
