## Environments

Sometimes you want to ensure the safety of certain values that are constant accross sequential compositions.
This parameter is called an environment. And to simplify the composition of this kind of Composable
we always define it with a single input. Therefore we have the type

```ts
Composable<(input: I, environment: E) => O>
```

A common use case would be a sequence of functions that depend on an authorization system.
The currently authenticated user would have to be propagated every time there is a sequential composition.
To avoid such awkwardness we use environments:

```tsx
import { environment } from 'composable-functions'
const dangerousFunction = composable(async (input: string, { user } : { user: { name: string, admin: boolean } }) => {
  // do something that only the admin can do
})

const carryUser = environment.pipe(gatherInput, dangerousFunction)
```

## Composing with environments

These combinators are useful for composing functions with environment. Note that the standard parallel compositions will work just fine with the concept of environments.

### `pipe`

The environment.pipe function allows you to compose multiple functions in a sequence, forwarding the environment to each function in the chain.

```ts
import { environment } from 'composable-functions'

const a = composable((str: string, env: { user: User }) => str === '1')
const b = composable((bool: boolean, env: { user: User }) => bool && env.user.admin)

const pipeline = environment.pipe(a, b)

const result = await pipeline('1', { user: { admin: true } })
/*
result = {
  success: true,
  data: true,
  errors: []
}
*/
```

### `sequence`
The environment.sequence function works similarly to pipe, but it returns a tuple containing the result of each function in the sequence.

```ts
import { environment } from 'composable-functions'

const a = composable((str: string, env: { user: User }) => str === '1')
const b = composable((bool: boolean, env: { user: User }) => bool && env.user.admin)

const sequence = environment.sequence(a, b)

const result = await sequence('1', { user: { admin: true } })
/*
result = {
  success: true,
  data: [true, true],
  errors: []
}
*/
```

### `branch`

The environment.branch function adds conditional logic to your compositions, forwarding the environment to each branch as needed.

```ts
import { composable, environment } from 'composable-functions'

const adminIncrement = composable((a: number, { user }: { user: { admin: boolean } }) =>
  user.admin ? a + 1 : a
)
const adminMakeItEven = (sum: number) => sum % 2 != 0 ? adminIncrement : null
const incrementUntilEven = environment.branch(adminIncrement, adminMakeItEven)

const result = await incrementUntilEven(1, { user: { admin: true } })
/*
result = {
  success: true,
  data: 2,
  errors: []
}
*/
```
