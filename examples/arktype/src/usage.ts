import { composable, withSchema } from 'composable-functions'
import { applyArkSchema, withArkSchema, adapt } from './adapters'
import { type } from 'arktype'

const appliedFn = applyArkSchema(type({ a: 'number', b: 'number' }))(
  composable(({ a, b }: { a: number; b: number }) => a + b),
)
const withFn = withArkSchema(
  type({ a: 'number' }),
  type({ b: 'number' }),
)(({ a }, { b }) => a + b)

const withAdapt = withSchema(adapt(type({ a: 'number', b: 'number' })))(
  ({ a, b }) => a + b,
)

const resultApplied = await appliedFn({ a: 1, b: 2 })
console.log(resultApplied)
// { success: true, data: 3, errors: [] }

const resultWith = await withFn({ a: '1' }, { b: 2 })
console.log(resultWith)
// {
//   success: false,
//   errors: [InputError("must be a number (was string)", ["a"])]
// }

const resultAdapted = await withAdapt({ a: 1, b: 2 })
console.log(resultAdapted)
// { success: true, data: 3, errors: [] }
