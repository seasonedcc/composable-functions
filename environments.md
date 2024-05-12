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

* pipe
* sequence
* branch
