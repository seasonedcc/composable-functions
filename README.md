<p align="center">
  <img width="300" src="https://github.com/seasonedcc/composable-functions/assets/566971/b786f157-9fb1-4506-9ddb-e438dcde06c8" alt="Composable Functions" />
</p>

A set of types and functions to make compositions easy and safe.

- 🛟 Type-safe compositions of functions
- 🧠 Always unwrap promises and errors as default
- 😣 Get rid of the terrible try/catch syntax
- ✅ End-to-end type safety, all the way from the Backend to the UI
- 🏝️ Isolate your business logic making it easier to test and maintain
- 📝 Allows business logic to be expressed in the type system

#### Go to [API Reference](./API.md)

## Table of contents
- [Quickstart](#quickstart)
- [Composing type-safe functions](#composing-type-safe-functions)
- [Creating primitive composables](#creating-primitive-composables)
- [Sequential composition](#sequential-composition)
  - [Using non-composables (mapping)](#using-non-composables-mapping)
- [Parallel composition](#parallel-composition)
- [Handling errors](#handling-errors)
  - [Throwing](#throwing)
  - [Catching](#catching)
  - [Mapping the errors](#mapping-the-errors)
- [Unwrapping the result](#unwrapping-the-result)
- [Recipes](#recipes)
    - [- Migrating from domain-functions](#--migrating-from-domain-functions)
    - [- Handling external input](#--handling-external-input)
    - [- Defining constants for multiple functions (environments)](#--defining-constants-for-multiple-functions-environments)
- [Using Deno](#using-deno)
- [Acknowledgements](#acknowledgements)

## Quickstart

```
npm i composable-functions
```

```tsx
import { composable, pipe } from 'composable-functions'

const faultyAdd = composable((a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
})
const show = composable(String)
const addAndShow = pipe(faultyAdd, show)

const result = await addAndShow(2, 2)
/*
result = {
  success: true,
  data: "4",
  errors: []
}
*/
const failedResult = await addAndShow(1, 2)
/*
failedResult = {
  success: false,
  errors: [<Error object>]
}
*/
```

## Composing type-safe functions
Let's say we want to compose two functions: `add: (a: number, b:number) => number` and `toString: (a: number) => string`. We also want the composition to preserve the types, so we can continue living in the happy world of type-safe coding. The result would be a function that adds and converts the result to string, something like `addAndReturnString: (a: number, b: number) => string`.

Performing this operation manually is straightforward

```typescript
function addAndReturnString(a: number, b: number): string {
  return toString(add(a, b))
}
```

It would be neat if typescript could do the typing for us and provided a more generic mechanism to compose these functions. Something like what you find in libraries such as [lodash](https://lodash.com/docs/4.17.15#flow)

Using composables the code could be written as:

```typescript
const addAndReturnString = pipe(add, toString)
```

We can also extend the same reasoning to functions that return promises in a transparent way. Imagine we have `add: (a: number, b:number) => Promise<number>` and `toString: (a: number) => Promise<string>`, the composition above would work in the same fashion, returning a function `addAndReturnString(a: number, b: number): Promise<string>` that will wait for each promise in the chain before applying the next function.

This library also defines several operations besides the `pipe` to compose functions in arbitrary ways, giving a powerful tool for the developer to reason about the data flow **without worrying about mistakenly connecting the wrong parameters** or **forgetting to unwrap some promise** or **handle some error** along the way.

## Creating primitive composables

A `Composable` is a function that returns a `Promise<Result<T>>` where `T` is any type you want to return. Values of the type `Result` will represent either a failure (which carries a list of errors) or a success, where the computation has returned a value within the type `T`.

So we can define the `add` and the `toString` functions as a `Composable`:

```typescript
import { composable } from 'composable-functions'

const add = composable((a: number, b: number) => a + b)
//    ^? Composable<(a: number, b: number) => number>

const toString = composable((a: unknown) => `${a}`)
//    ^? Composable<(a: unknown) => string>
```

## Sequential composition
Now we can compose them using pipe to create `addAndReturnString`:

```typescript
import { pipe } from 'composable-functions'

const addAndReturnString = pipe(add, toString)
//    ^? Composable<(a: number, b: number) => string>
```

Note that trying to compose pipe flipping the arguments will not type-check:

```typescript
import { pipe } from 'composable-functions'

const addAndReturnString = pipe(toString, add)
//    ^? Internal.FailToCompose<string, number>
```

Since pipe will compose from left to right, the only `string` output from `toString` will not fit into the first argument of `add` which is a `number`.
The error message comes in the form of an inferred `FailToCompose` type, this failure type is not callable therefore it will break any attempts to call `addAndReturnString`.

### Using non-composables (mapping)

Sometimes we want to use a simple function in this sort of sequential composition. Imagine that `toString` is not a composable, and you just want to apply a plain old function to the result of `add` when it succeeds.
The function `map` can be used for this, since we are mapping over the result of a `Composable`:

```typescript
import { map } from 'composable-functions'

const addAndReturnString = map(add, result => `${result}`)
```

## Parallel composition

There are also compositions where all functions are excuted in parallel, like `Promise.all` will execute several promises and wait for all of them.
The `all` function is one way of composing in this fashion. Assuming we want to apply our `add` and multiply the two numbers returning a success only once both operations succeed:

```typescript
import { composable, all } from 'composable-functions'

const add = composable((a: number, b: number) => a + b)
const mul = composable((a: number, b: number) => a * b)
const addAndMul = all(add, mul)
//    ^? Composable<(a: number, b: number) => [number, number]>
```
The result of the composition comes in a tuple in the same order as the functions were passed to `all`.
Note that the input functions will also have to type-check and all the functions have to work from the same input.

## Handling errors
Since a `Composable` always return a type `Result<T>` that might be either a failure or a success, there are never exceptions to catch. Any exception inside a `Composable` will return as an object with the shape: `{ success: false, errors: Error[] }`.

Two neat consequences is that we can handle errors using functions (no need for try/catch blocks) and handle multiple errors at once.

### Throwing

### Catching
You can catch an error in a `Composable`, using `catchFailure` which is similar to `map` but will run whenever the first composable fails:

```typescript
import { composable, catchFailure } from 'composable-functions'

const getUser = composable((id: string) => fetchUser(id))
//    ^? Composable<(id: string) => User>
const getOptionalUser = catchFailure(getUser, (errors, id) => {
  console.log(`Failed to fetch user with id ${id}`, errors)
  return null
})
//    ^? Composable<(id: string) => User | null>
```

### Mapping the errors
Sometimes we just need to transform the errors into something that would make more sense for the caller. Imagine you have our `getUser` defined above, but we want a custom error type for when the ID is invalid. You can map over the failures using `mapErrors` and a function with the type `(errors: Error[]) => Error[]`.

```typescript
import { mapErrors } from 'composable-functions'

class InvalidUserId extends Error {}
const getUserWithCustomError = mapErrors(getUser, (errors) =>
  errors.map((e) => e.message.includes('Invalid ID') ? new InvalidUserId() : e)
)
```
## Unwrapping the result
Keep in mind the `Result` type will only have a `data` property when the composable succeeds. If you want to unwrap the result, you must check for the `success` property first.

```typescript
const result = await getUser('123')
if (!result.success) return notFound()

return result.data
//            ^? User
```

TypeScript won't let you access the `data` property without checking for `success` first, so you can be sure that you are always handling the error case.
```ts
const result = await getUser('123')
// @ts-expect-error: Property 'data' does not exist on type 'Result<User>'
return result.data
```

You can also use `fromSuccess` to unwrap the result of a composable that is expected to always succeed. Keep in mind that this function will throw an error if the composable fails so you're losing the safety layer of the `Result` type.

```ts
const fn = composable(async (id: string) => {
  const valueB = await fromSuccess(anotherComposable)({ userId: id })
  // do something else
  return { valueA, valueB }
})
```
We recomend only using `fromSuccess` when you are sure the composable must succeed, like when you are testing the happy path of a composable.

You can also use it within other composables whenever the composition utilities fall short, the error will be propagated as `ErrorList` and available in the caller `Result`.

```ts
const getUser = composable((id: string) => db().collection('users').findOne({ id }))

const getProfile = composable(async (id: string) => {
  const user = await fromSuccess(getUser)(id)
  // ... some logic
  return { user, otherData }
})
```

## Recipes

#### - [Migrating from domain-functions](./migrating-df.md)
#### - [Handling external input](./with-schema.md)
#### - [Defining constants for multiple functions (environments)](./environments.md)

## Using Deno

If you are using [Deno](https://deno.land/), just directly import the functions you need from [deno.land/x](https://deno.land/x):

```ts
import { composable } from "https://deno.land/x/composable_functions/mod.ts";
```

This documentation will use Node.JS imports by convention, just replace `composable-functions` with `https://deno.land/x/composable_functions/mod.ts` when using [Deno](https://deno.land/).


## Acknowledgements

Composable Functions' logo by [NUMI](https://github.com/numi-hq/open-design):

[<img src="https://raw.githubusercontent.com/numi-hq/open-design/main/assets/numi-lockup.png" alt="NUMI Logo" style="width: 200px;"/>](https://numi.tech/?ref=string-ts)
