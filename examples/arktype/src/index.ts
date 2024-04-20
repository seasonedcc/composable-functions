import { composable } from 'composable-functions'
import { applyArkSchema, withArkSchema } from './adapters'
import { type } from 'arktype'

const fn = composable((a: number, b: number) => a + b)
const schemaFn = applyArkSchema(fn, type('number'), type('number'))
const df = withArkSchema(type('number'), type('number'))((a, b) => a + b)

const result = await schemaFn(1, 2)
console.log(result)
// { success: true, data: 3, errors: [] }

const result2 = await df('1', 2)
console.log(result2)
// {
//   success: false,
//   errors: [InputError("must be a number (was string)", [])]
// }
