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




<!-- GPT -->

# Handling Environments

Composable-functions allow you to manage environments in your compositions, ensuring that contextual information is passed correctly through your function chains. This is particularly useful for scenarios where you need to maintain consistency in data such as user information, configuration settings, or other contextual parameters.

## Environment-based Combinators

The `environment` namespace provides a set of combinators that ensure the environment is correctly forwarded through sequential compositions. These combinators are essential when you need to maintain context across multiple function calls.

### Environment Pipe

The `environment.pipe` function allows you to compose multiple functions in a sequence, forwarding the environment to each function in the chain.

```typescript
import { environment } from 'composable-functions'

const a = composable((num: number, env: { user: User }) => String(num))
const b = composable((str: string, env: { user: User }) => str === '1')
const c = composable((bool: boolean, env: { user: User }) => bool && env.user.admin)

const pipeline = environment.pipe(a, b, c)

const result = await pipeline(1, { user: { admin: true } })
/*
result = {
  success: true,
  data: false,
  errors: []
}
*/
```

### Environment Sequence

The environment.sequence function works similarly to pipe, but it returns a tuple containing the result of each function in the sequence.

```ts
import { environment } from 'composable-functions'

const a = composable((num: number, env: { user: User }) => String(num))
const b = composable((str: string, env: { user: User }) => str === '1')
const c = composable((bool: boolean, env: { user: User }) => bool && env.user.admin)

const sequence = environment.sequence(a, b, c)

const result = await sequence(1, { user: { admin: true } })
/*
result = {
  success: true,
  data: ['1', true, false],
  errors: []
}
*/
````

### Environment Branch

The environment.branch function adds conditional logic to your compositions, forwarding the environment to each branch as needed.

```ts
import { environment } from 'composable-functions'

const getIdOrEmail = composable((data: { id?: number, email?: string }) => data.id ?? data.email)
const findUserById = composable((id: number, env: { user: User }) => {
  if (!env.user.admin) throw new Error('Unauthorized')
  return db.users.find({ id })
})
const findUserByEmail = composable((email: string, env: { user: User }) => {
  if (!env.user.admin) throw new Error('Unauthorized')
  return db.users.find({ email })
})

const findUserByIdOrEmail = environment.branch(
  getIdOrEmail,
  (data) => (typeof data === "number" ? findUserById : findUserByEmail)
)

const result = await findUserByIdOrEmail({ id: 1 }, { user: { admin: true } })
/*
result = {
  success: true,
  data: { id: 1, email: 'john@doe.com' },
  errors: []
}
*/
````

Using these environment-based combinators ensures that your context is preserved across complex compositions, making your business logic more predictable and easier to manage.

