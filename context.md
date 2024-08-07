## Context

Sometimes you want to ensure the safety of certain values that are constant accross sequential compositions.
This parameter is called context. And to simplify the composition of this kind of Composable
we always define it with a single input. Therefore we have the type

```ts
Composable<(input: I, context: C) => O>
```

A common use case would be a sequence of functions that depend on an authorization system.
The currently authenticated user would have to be propagated every time there is a sequential composition.
To avoid such awkwardness we use context:

```tsx
import { withContext } from 'composable-functions'
const dangerousFunction = async (input: string, { user } : { user: { name: string, admin: boolean } }) => {
  // do something that only the admin can do
}

const carryUser = withContext.pipe(gatherInput, dangerousFunction)
```

## Composing with context

These combinators are useful for composing functions with context. Note that the standard parallel compositions will work just fine with the concept of context.

### `pipe`

The `withContext.pipe` function allows you to compose multiple functions in a sequence, forwarding the context to each function in the chain.

```ts
import { withContext } from 'composable-functions'

const a = (str: string, ctx: { user: User }) => str === '1'
const b = (bool: boolean, ctx: { user: User }) => bool && ctx.user.admin

const pipeline = withContext.pipe(a, b)

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
The `withContext.sequence` function works similarly to pipe, but it returns a tuple containing the result of each function in the sequence.

```ts
import { withContext } from 'composable-functions'

const a = (str: string, ctx: { user: User }) => str === '1'
const b = (bool: boolean, ctx: { user: User }) => bool && ctx.user.admin

const sequence = withContext.sequence(a, b)

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

The `withContext.branch` function adds conditional logic to your compositions, forwarding the context to each branch as needed.

```ts
import { withContext } from 'composable-functions'

const adminIncrement = (a: number, { user }: { user: { admin: boolean } }) =>
  user.admin ? a + 1 : a
const adminMakeItEven = (sum: number) => sum % 2 != 0 ? adminIncrement : null
const incrementUntilEven = withContext.branch(adminIncrement, adminMakeItEven)

const result = await incrementUntilEven(1, { user: { admin: true } })
/*
result = {
  success: true,
  data: 2,
  errors: []
}
*/
```
