import { branch, pipe, sequence } from './index.ts'

/**
 * @deprecated use `import { context } from 'composable-functions'` instead
 */
const environment = {
  branch,
  pipe,
  sequence,
}

// deno-lint-ignore verbatim-module-syntax
export { environment }
