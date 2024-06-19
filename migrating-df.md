# Migrating from domain-functions

If you are coming from `domain-functions`, you will find that `composable-functions` is a more flexible and powerful and better typed library.
This document will guide you through the migration process.

## Benefits of Migrating from `domain-functions` to `composable-functions`

-	🛡️ Enhanced Type Safety: Enjoy robust **type-safety during function composition**. The improved type-checking mechanisms prevent incompatible functions from being composed, reducing runtime errors and improving code reliability.
-	🤌 Simplified Function Creation: **No need to define schemas**. Create composable functions easily and efficiently without the overhead of schema definitions.
-	🕵🏽 Runtime Validation: Use the [`withSchema`](./API.md#withschema) function for optional runtime validation of inputs and context. This provides flexibility to enforce data integrity when needed without mandating it for every function. Assuming you have a big chain of composables you can use [`applySchema`](./API.md#applyschema) to run your runtime validation only once **avoiding unnecessary processing**.
-	🔀 Flexible Compositions: The new combinators, such as [`context.pipe`](./API.md#contextpipe), [`context.sequence`](./API.md#contextsequence), and [`context.branch`](./API.md#contextbranch), offer powerful ways to manage **typed context** which are contextual information across your compositions.
-	🛠️ Incremental Migration: Seamlessly migrate your existing codebase incrementally. **Both `domain-functions` and `composable-functions` can coexist**, allowing you to transition module by module.
-	🛟 Enhanced Combinators: New and improved combinators like [`map`](./API.md#map), [`mapParameters`](./API.md#mapparameters), [`mapErrors`](./API.md#maperrors) and [`catchFailure`](./API.md#catchfailure) provide more control over error handling and transformation, making your **code more resilient**.

# Table of contents
- [First steps](#first-steps)
  - [The new `Result` type - `Success<T> | Failure`](#the-new-result-type---successt--failure)
    - [Serialization](#serialization)
- [Combinators which shouldn't be affected](#combinators-which-shouldnt-be-affected)
- [Sequential combinators and the concept of context](#sequential-combinators-and-the-concept-of-context)
- [Modified combinators](#modified-combinators)
  - [map](#map)
  - [mapError](#maperror)
  - [trace](#trace)
- [Removed combinators](#removed-combinators)
  - [first](#first)
  - [collectSequence](#collectsequence)
  - [merge](#merge)
- [Incremental migration](#incremental-migration)
  - [Dealing with Failures](#dealing-with-failures)
- [Equivalence tables](#equivalence-tables)
    - [Constructors](#constructors)
    - [Combinators](#combinators)
    - [Type utilities](#type-utilities)
    - [Runtime code](#runtime-code)

## First steps
The first thing you want to know is that the old `DomainFunction<T>` is equivalent to `Composable<(input?: unknown, context?: unknown) => T>` (AKA `ComposableWithSchema<T>`). We brought the arguments to the type signature so we could type check the compositions. A [commonly requested feature](https://github.com/seasonedcc/domain-functions/issues/80) in domain-functions.

A composable does not need a schema, but you can still use one for runtime assertion. What we used to call a Domain Function is now a Composable with [context](./context.md) and a schema.

The new constructor `withSchema` will work almost exactly as `makeDomainFunction`, except for the `Result` type of the resulting function.

### The new `Result` type - `Success<T> | Failure`
We removed the inputErrors and environmentErrors from the result and represent all of them using instances of `Error`.

This allows us to preserve stack traces and use the familiar exception interface. To differentiate inputErrors and environmentErrors - which are now called context errors - you can use the `instanceof` operator. It also opens up the possibility create any custom error your system needs.

```ts
// Old ErrorResult:
{
  success: false,
  errors: [{ message: 'Something went wrong' }],
  inputErrors: [{ message: 'Required', path: ['name'] }],
  environemntErrors: [{ message: 'Unauthorized', path: ['user'] }],
}

// New Failure:
{
  success: false,
  errors: [
    new Error('Something went wrong'),
    new InputError('Required', ['name']),
    new ContextError('Unauthorized', ['user']),
  ],
}
```

#### Serialization
The issue with native JS errors is that they lose most information when serialized to JSON.

To solve that, whenever you send a `Result` over the wire you may use the new `serialize` helper that will turn your errors into a friendly object format, similar to the old `ErrorMessage` type:

```ts
const serializedResult = JSON.stringify(serialize({
  success: false,
  errors: [new InputError('Oops', ['name'])],
}))

// serializedResult is:
`"{ success: false, errors: [{ message: 'Oops', name: 'InputError', path: ['name'] }] }"`
```

## Combinators which shouldn't be affected
The parallel combinators like `all` and `collect`, along with `map` and `fromSuccess` should work the same way.

## Sequential combinators and the concept of context
The `environment` we used to have in domain-functions is now called `context` and it is already built-in the composable's parallel combinators since all arguments are forwarded to every function. For a deeper explanation check the [`context` docs](./context.md).

When it comes to sequential compositions, however, we need special combinators to preserve the context so they work as the domain-functions' combinators.

Use the sequential combinators from the namespace `context` to keep this familiar behavior.

```ts
import { context } from 'composable-functions'

const result = context.pipe(fn1, fn2)(input, ctx)
// same for `context.sequence` and `context.branch`
```

**Note**: The `pipe`, `sequence`, and `branch` outside of the `context` namespace will not keep the context through the composition.

## Modified combinators
### map
The `map`'s mapper function now receives all the arguments given to the composable. In domain-functions the mapper would only work with the output of the first function, that limitation is gone therefore we can work with both input and output.

```ts
const add = composable((a: number, b: number) => a + b)
const aggregateInputAndOutput = map(add, (result, a, b) => ({ result, a, b }))
//    ^? Composable<(a: number, b: number) => { result: number, a: number, b: number }>
```

### mapError
The `mapError` was renamed to `mapErrors` function and it now receives and returns an `Array<Error>` instead of an `ErrorData` - which was removed.
Since the new `Failure` is much simpler than `ErrorResult` this change will often lead to simpler code:

```ts
// Old DF code:
import { mapError } from 'domain-functions'

const summarizeErrors = (result: ErrorData) =>
  ({
    errors: [{ message: 'Number of errors: ' + result.errors.length }],
    inputErrors: [
      { message: 'Number of input errors: ' + result.inputErrors.length },
    ],
    environmentErrors: [
      { message: 'Number of environment errors: ' + result.environmentErrors.length },
    ],
  } as ErrorData)

const incrementWithErrorSummary = mapError(increment, summarizeErrors)

// New Composable code:
import { mapErrors, isInputError, isContextError } from 'composable-functions'

const summarizeErrors = (errors: Error[]) =>
  [
    new Error('Number of errors: ' + errors.filter((e) => !isInputError(e) && !isContextError(e)).length,
    new InputError('Number of input errors: ' + errors.filter(isInputError).length),
    new ContextError('Number of context errors: ' + errors.filter(isContextError).length),
  ]

const incrementWithErrorSummary = mapErrors(increment, summarizeErrors)
```

### trace
The `trace` function would get a function that had `result`, `input`, and `environment` as arguments. Now the only change is that it receives all the arguments given to the function. In domain-functions the arguments were always input and environment but in composable-functions that limitation is gone therefore we can't assure it will always be the same.

```ts
const fn = composable((a: number, b: number, c: number) => a + b + c)
const withTrace = trace((...args) => console.log(...args))(fn)
const result = await withTrace(1, 2, 3)
// This will log: [{ success: true, data: 6, errors: [] }, 1, 2, 3]
```

## Removed combinators
### first
This function was removed because it had a hazardous behavior. It would return the first successful result, but it would run all functions in parallel which could cause unexpected side effects.

Since we introduced `branch` we never had a use case for `first` since we used `first` solely for adding conditional logic in our compositions which `branch` does much better.
We appreciate any feedback on this decision.

### collectSequence
We removed this function because even though ECMAScript guarantees the order of the keys in an object, to get this typing right is very challenging.

If you want similar functionality, you can use `sequence` and `map` to give names to the results like so:

```ts
// instead of
const df = collectSequence({
  name: nameDf,
  age: ageDf,
})

// you can do
const fn = map(sequence(nameDf, ageDf), ([name, age]) => ({ name, age }))
```

### merge
We also removed the `merge` function because it was not a total function which meant that later domain-functions could override the previous ones.

You can easily achieve the same result with the `map` with `all` and `mergeObjects` functions like so:

```ts
// instead of
const df1 = makeDomainFunction()(() => ({ firstName: 'John' }))
const df2 = makeDomainFunction()(() => ({ lastName: 'Doe' }))
const df = merge(df1, df2)
//    ^? DomainFunction<{ firstName: string, lastName: string }>

// you can do
const fn1 = composable(() => ({ firstName: 'John' }))
const fn2 = composable(() => ({ lastName: 'Doe' }))
const fn = map(all(fn1, fn2), mergeObjects)
```

## Incremental migration
You don't need to migrate the whole project at once.
You can have both libraries in the project and migrate one module at a time.

Choose a module that has fewer dependants and swipe all constructors from `makeDomainFunction` to `withSchema`.

If your compositions are using domain functions from other modules, you'll see type errors. You can use the `toComposable` from `domain-functions@3.0` to avoid having to migrate those modules.

During the migration, you might need to have polymorphic functions that can accept both `DomainFunction` and `Composable` or the different `Result` of both libraries. Check out an example of how to do that:

```ts
import type { Result as DFResult } from 'domain-functions'
import { isInputError, isContextError } from 'composable-functions'
import type { Result, SerializableResult } from 'composable-functions'

const isFormError = (result: SerializableResult | Result | DFResult) => {
  if ("inputErrors" in result) {
    return result.inputErrors.length > 0
  }
  return result.errors.some(isInputError)
}

const isEnvError = (result: SerializableResult | Result | CFResult) => {
  if ("environmentErrors" in result) {
    return result.environmentErrors.length > 0
  }
  return result.errors.some(isContextError)
}
```

Once you finish migrating the other modules you can remove the `domain-functions` dependency.

### Dealing with Failures
- In the tests, change the `result.inputErrors` and `result.environmentErrors` for `result.errors`. You can also test for the name: `InputError` or `ContextError`
```ts
// replace this
expect(result.inputErrors).containSubset([{ path: ['name'] }])
// with this
expect(result.errors).containSubset([{ name: 'InputError', path: ['name'] }])
```
- Elsewhere, collect the inputErrors and environmentErrors with the [`isInputError`](./API.md#isinputerror) and [`isContextError`](./API.md#iscontexterror) functions.
```ts
// replace this
if (result.inputErrors.length > 0) {
  return result.inputErrors[0].message
}
// with this
if (result.errors.some(isInputError)) {
  return result.errors.find(isInputError).message
}
```

# Equivalence tables

#### Constructors
| Domain Functions | Composable Functions |
|---|---|
| `makeDomainFunction(z.string(), z.number())((input, env) => {})` | `withSchema(z.string, z.number())((input, ctx) => {})` |
| -- | `applySchema(z.string(), z.number())(composable((input, ctx) => {}))` |
| `makeSuccessResult(1)` | `success(1)` |
| `makeErrorResult({ errors: [{ message: 'Something went wrong' }] })` | `failure([new Error('Something went wrong')])` |
| `new InputError('required', 'user.name')` | `new InputError('required', ['user', 'name'])` |
| `new EnvironmentError('oops', 'user.name')` | `new ContextError('oops', ['user', 'name'])` |
| `new InputErrors([{ message: 'oops', path: 'user.name' }])` | `new ErrorList([new InputError('oops', ['user', 'name'])])` |
| `new ResultError({ inputErrors: [{ message: 'oops', path: 'user.name' }] })` | `new ErrorList([new InputError('oops', ['user', 'name'])])` |

#### Combinators
| Domain Functions | Composable Functions |
|---|---|
| `all(df1, df2)` | `all(fn1, fn2)` |
| `collect(df1, df2)` | `collect(fn1, fn2)` |
| `merge(df1, df2)` | `map(all(fn1, fn2), mergeObjects)` |
| `branch(df1, (res) => res ? null : df2)` | `context.branch(fn1, (res) => res ? null : fn2)` |
| -- | `branch(fn1, (res) => res ? null : fn2)` without context |
| `pipe(df1, df2)` | `context.pipe(fn1, fn2)` |
| -- | `pipe(fn1, fn2)` without context |
| `sequence(df1, df2)` | `context.sequence(fn1, fn2)` |
| -- | `sequence(fn1, fn2)` without context |
| `collectSequence({ name: nameDf, age: ageDf })` | `map(context.sequence(nameDf, ageDf), ([name, age]) => ({ name, age }))` |
| `map(df, (o) => ({ result: o }))` | `map(fn, (o) => ({ result: o }))` |
| -- | `map(fn, (o, ...args) => ({ result: o, args }))` |
| `first(df1, df2)` | -- * read docs above |
| `safeResult(() => { throw new Error('oops') })` | `composable(() => { throw new Error('oops') })` |
| `mapError(df, (result) => ({ inputErrors: [], environmentErrors: [], errors: [{ message: 'Oops' }] }))` | `mapErrors(fn, errors => [new Error('Oops')])` |
| `trace(({ result, input, environment }) => console.log({ result, input, environment }))(df)` | `trace((result, ...args) => console.log(result, ...args))(fn)` |


#### Type utilities
| Domain Functions | Composable Functions |
|---|---|
| `DomainFunction<string>` | `ComposableWithSchema<string>` |
| `SuccessResult<T>` | `Success<T>` |
| `ErrorResult` | `Failure` |
| `UnpackData<DomainFunction>` | `UnpackData<Composable>` |

#### Runtime code
| Domain Functions | Composable Functions |
|---|---|
| `{ success: true, data: { name: 'John' }, errors: [], inputErrors: [], environmentErrors: [] }` | `{ success: true, data: { name: 'John' }, errors: [] }` |
| `{ success: false, errors: [{ message: 'Something went wrong' }], inputErrors: [{ message: 'Required', path: ['name'] }], environemntErrors: [{ message: 'Unauthorized', path: ['user'] }] }` | `{ success: false, errors: [new Error('Something went wrong'), new InputError('Required', ['name']), new ContextError('Unauthorized', ['user'])] }` |
| -- | with `serialize`: `{ success: false, errors: [{ message: 'Something went wrong', name: 'Error', path: [] }, { message: 'Required', name: 'InputError', path: ['name'] }, { message: 'Unauthorized', name: 'ContextError', path: ['user'] }] }` |
| `result.inputErrors[0]?.message` | `result.errors.find(isInputError)?.message` |
| `result.environmentErrors[0]?.message` | `result.errors.find(isContextError)?.message` |
| `result.errors[0]?.exception instanceof CustomError` | `result.errors[0] instanceof CustomError` |
