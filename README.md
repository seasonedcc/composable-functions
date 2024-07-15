<p align="center">
  <img width="300" src="./logo.png" alt="Composable Functions" />
</p>

A set of types and functions to make compositions easy and safe.

- 🛟 Type-Safe Compositions: Ensure robust type-safety during function composition, preventing incompatible functions from being combined and reducing runtime errors.
- 🔄 Promise and Error Handling: Focus on the happy-path of your functions, eliminating the need for verbose try/catch syntax.
- 🏝️ Isolated Business Logic: Split your code into composable functions, making your code easier to test and maintain.
- 🔒 End-to-End Type Safety: Achieve end-to-end type safety from the backend to the UI with serializable results, ensuring data integrity across your entire application.
-	⚡ Parallel and Sequential Compositions: Compose functions both in parallel - with `all` and `collect` - and sequentially - with `pipe`, `branch`, and `sequence` -, to manage complex data flows optimizing your code for performance and clarity.
-	🕵️‍♂️ Runtime Validation: Use `applySchema` with your favorite parser for optional runtime validation of inputs and context, enforcing data integrity only when needed.
-	🚑 Resilient Error Handling: Leverage enhanced combinators like `mapErrors` and `catchFailure` to transform and handle errors more effectively.
-	📊 Traceable Compositions: Use the `trace` function to log and monitor your composable functions’ inputs and results, simplifying debugging and monitoring.

#### Go to [API Reference](./API.md)

## Table of contents
- [Quickstart](#quickstart)
- [Composing type-safe functions](#composing-type-safe-functions)
  - [Adding runtime validation to the Composable](#adding-runtime-validation-to-the-composable)
- [Creating primitive composables](#creating-primitive-composables)
- [Sequential composition](#sequential-composition)
  - [Using non-composables (mapping)](#using-non-composables-mapping)
- [Parallel composition](#parallel-composition)
- [Handling errors](#handling-errors)
  - [Throwing](#throwing)
  - [Catching](#catching)
  - [Mapping the errors](#mapping-the-errors)
- [Unwrapping the result](#unwrapping-the-result)
- [Guides](#guides)
    - [Migrating from domain-functions](#migrating-from-domain-functions)
    - [Handling external input](#handling-external-input)
    - [Defining constants for multiple functions (context)](#defining-constants-for-multiple-functions-context)
    - [Using custom parsers](#using-custom-parsers)
- [Using Deno](#using-deno)
- [Acknowledgements](#acknowledgements)

## Quickstart

```
npm i composable-functions
```

```tsx
import { composable, pipe } from 'composable-functions'

const faultyAdd = (a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
}
const show = (a: number) => String(a)
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

### Adding runtime validation to the Composable
To ensure type safety at runtime, use the `applySchema` function to validate external inputs against defined schemas. These schemas can be specified with libraries such as [Zod](https://github.com/colinhacks/zod/) or [ArkType](https://github.com/arktypeio/arktype).

Note that the resulting `Composable` will have unknown types for the parameters now that we rely on runtime validation.

```ts
import { applySchema } from 'composable-functions'
import { z } from 'zod'

const addAndReturnWithRuntimeValidation = applySchema(
  z.number(),
  z.number(),
)(addAndReturnString)
```

For more information and examples, check the [Handling external input](./with-schema.md) guide.

## Creating primitive composables

A `Composable` is a function that returns a `Promise<Result<T>>` where `T` is any type you want to return. Values of the type `Result` will represent either a failure (which carries a list of errors) or a success, where the computation has returned a value within the type `T`.

We can create a `Composable` by wrapping a function with the `composable` method:

```typescript
import { composable } from 'composable-functions'

const add = composable((a: number, b: number) => a + b)
//    ^? Composable<(a: number, b: number) => number>
```

Or we can use combinators work with both plain functions and `Composable` to create other composables:

```typescript
import { composable, pipe } from 'composable-functions'

const add = composable((a: number, b: number) => a + b)
//    ^? Composable<(a: number, b: number) => number>
const toString = (a: unknown) => `${a}`

const addAndReturnString = pipe(add, toString)
//    ^? Composable<(a: number, b: number) => string>
```

## Sequential composition
We can compose the functions above using pipe to create `addAndReturnString`:

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
The error message comes in the form of an inferred `FailToCompose` type. This failure type is not callable, therefore it will break any attempts to call `addAndReturnString`.

### Transforming the output (mapping)

Sometimes we want to use a simple function to transform the output of another function. Imagine you want to apply a plain old function to the result of `add` when it succeeds.
The function `map` can be used for this:

```typescript
import { map } from 'composable-functions'

const addAndReturnString = map(add, result => `${result}`)
//    ^? Composable<(a: number, b: number) => string>
```

## Parallel composition

There are also compositions where all functions are excuted in parallel, like `Promise.all` will execute several promises and wait for all of them.
The `all` function is one way of composing in this fashion. Assuming we want to apply our `add` and multiply the two numbers returning a success only once both operations succeed:

```typescript
import { all } from 'composable-functions'

const add = (a: number, b: number) => a + b
const mul = (a: number, b: number) => a * b
const addAndMul = all(add, mul)
//    ^? Composable<(a: number, b: number) => [number, number]>
```
The result of the composition comes in a tuple in the same order as the functions were passed to `all`.
Note that the input functions will also have to type-check and all the functions have to work from the same input.

If you want to work with records instead of tuples, you can use the `collect` function:

```typescript
import { collect } from 'composable-functions'

const add = (a: number, b: number) => a + b
const mul = (a: number, b: number) => a * b
const addAndMul = collect({ add, mul })
//    ^? Composable<(a: number, b: number) => { add: number, mul: number }>
```

## Handling errors
Since a `Composable` always return a type `Result<T>` that might be either a failure or a success, there are never exceptions to catch. Any exception inside a `Composable` will return as an object with the shape: `{ success: false, errors: Error[] }`.

Two neat consequences is that we can handle errors using functions (no need for try/catch blocks) and handle multiple errors at once.

### Throwing

You can throw anything derived from `Error`. Check [this documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types) on how to define your custom errors. The library will also wrap anything that does not extend `Error`, just to keep compatibility with code-bases that throw strings or objects.

```typescript
import { composable } from 'composable-functions'

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

const getUser = composable((userId: string, users: Array<string>) => {
//    ^? Composable<(userId: string, users: Array<string>) => string>
    const result = users.find(({id}) => id === userId)
    if(result == undefined) throw new NotFoundError(`userId ${userId} was not found`)
    return result
})
```

The library defines a few custom errors out of the box but these will be more important later on, when dealing with external input and schemas.
See [the errors module](./src/errors.ts) for more details.

### Catching
You can catch an error in a `Composable` using `catchFailure`, which is similar to `map` but will run whenever the first composable fails:

```typescript
import { catchFailure } from 'composable-functions'

// assuming we have the definitions from the previous example
const getOptionalUser = catchFailure(getUser, (errors, id) => {
  console.log(`Failed to fetch user with id ${id}`, errors)
  return null
})
//    ^? Composable<(id: string) => string | null>
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

You can also use it within other composables whenever the composition utilities fall short. In that case, the error will be propagated as `ErrorList` and available in the caller `Result`.

```ts
const getUser = composable((id: string) => db().collection('users').findOne({ id }))

const getProfile = composable(async (id: string) => {
  const user = await fromSuccess(getUser)(id)
  // ... some logic
  return { user, otherData }
})
```

## Guides

#### [Migrating from domain-functions](./migrating-df.md)
#### [Handling external input](./with-schema.md)
#### [Defining constants for multiple functions (context)](./context.md)
#### [Using custom parsers](./examples/arktype/README.md)

## Using Deno

If you are using [Deno](https://deno.land/), just directly import the functions you need from [deno.land/x](https://deno.land/x):

```ts
import { composable } from "https://deno.land/x/composable_functions/mod.ts";
```

This documentation will use Node.JS imports by convention. Just replace `composable-functions` with `https://deno.land/x/composable_functions/mod.ts` when using [Deno](https://deno.land/).


## Acknowledgements

Composable Functions' logo by [NUMI](https://github.com/numi-hq/open-design):

[<img src="https://raw.githubusercontent.com/numi-hq/open-design/main/assets/numi-lockup.png" alt="NUMI Logo" style="width: 200px;"/>](https://numi.tech/?ref=string-ts)
