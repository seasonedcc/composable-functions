# Migrating from domain-functions

If you are coming from `domain-functions`, you will find that `composable-functions` is a more flexible and powerful library.
This document will guide you through the migration process.

# Table of contents
<!-- HERE -->

## First steps
The first thing you want to know is that the old `DomainFunction<T>` is equivalent to `Composable<(input?: unknown, environment?: unknwon) => T>`. We brought the arguments to the type signature se we could type check the compositions. A [commonly requested feature](https://github.com/seasonedcc/domain-functions/issues/80).

A composable does not need a schema, but you can still use one for runtime assertion. What we used to call a Domain Function is now a Composable with an environment and a schema.

The new constructor `withSchema` will work almost exactly as `makeDomainFunction`, except for the `Result` type of the resulting function.

### The new `Result` type - `Success<T> | Failure`
We removed the inputErrors and environmentErrors from the result and represent all of them using instances of `Error`.

This allows us to preserve stack traces and use the familiar exception interface. To differentiate inputErrors and environmentErrors you can use the `instanceof` operator. It also opens up the possibility create any custom error your system needs.

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
    new EnvironmentError('Unauthorized', ['user']),
  ],
}
```

#### Serialization
The issue with native JS errors is that they lose most information when serialized to JSON.

To solve that, whenever you send a `Result` over the wire you may use the new `serialize` helper that will turn your errors into a friendly object format:
```ts
const serializedResult = JSON.stringify(serialize({
  success: false,
  errors: [new InputError('Oops', ['name'])],
}))

// serializedResult is:
`"{ success: false, errors: [{ message: 'Oops', name: 'InputError', path: ['name'] }] }"`
```

## Incremental migration
You don't need to migrate the whole project at once.
You can have both libraries in the project and migrate one module at a time.

Choose a module that has fewer dependents, swipe all constructors from `makeDomainFunction` to `withSchema`.

If your compositions are using domain functions from other modules, you'll see type errors. You can use the `toComposable` function below to avoid having to migrate those modules.

```ts
function toComposable<T>(df: DomainFunction<T>) {
  return (async (...args) => {
    const result = await df(...args)
    if (result.success) {
      return { success: true, errors: [], data: result.data }
    }
    return {
      success: false,
      errors: [
        ...result.errors.map((e) => e.exception),
        ...result.inputErrors.map(
          ({ message, path }) => new InputError(message, path),
        ),
        ...result.environmentErrors.map(
          ({ message, path }) => new EnvironmentError(message, path),
        ),
      ],
    }
  }) as Composable<(input?: unknown, environment?: unknown) => T>
}
```

### Asserting on Failures
- In the tests, change the `result.inputErrors` and `result.environmentErrors` for `result.errors`. You can test for the name: `InputError` or `EnvironmentError`
```ts
expect(result.inputErrors).containSubset([{ path: ['name'] }])
expect(result.errors).containSubset([{ name: 'InputError', path: ['name'] }])
```

## Combinators which shouldn't be affected
The parallel combinators like `all` and `collect`, along with `map` and `fromSuccess` should work the same way.

## Sequential combinators and the concept of environment
TODO

## Modified combinators
### mapError
The `mapError` function now receives and returns an `Array<Error>` instead of an `ErrorData` - which was removed.
Since the new `Failure` is much simpler than `ErrorResult` this change will often lead to simpler code:

```ts
// Old DF code:
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
const isInputError = (e: Error): e is InputError => e instanceof InputError
const isEnvError = (e: Error): e is EnvironmentError => e instanceof EnvironmentError
const summarizeErrors = (errors: Error[]) =>
  [
    new Error('Number of errors: ' + errors.filter(e => !isInputError(e) && !isEnvError(e)).length),
    new InputError('Number of input errors: ' + errors.filter(isInputError).length),
    new EnvironmentError('Number of environment errors: ' + errors.filter(isEnvError).length),
  ]

const incrementWithErrorSummary = mapError(increment, summarizeErrors)
```

### trace
The `trace` function would get a function that had `result`, `input`, and `environment` as arguments. Now the only change is that it received all the arguments given to the function. In domain-functions the arguments were always input and environment but in composable-functions that limitation is gone therefore we can't assure it will always be the same.

```ts
const fn = composable((a: number, b: number, c: number) => a + b + c)
const withTrace = trace((...args) => console.log(...args))(fn)
const result = await withTrace(1, 2, 3)
// This will log: [{ success: true, data: 6, errors: [] }, 1, 2, 3]
```

## Removed combinators
### first
This function was removed because it had a hazardous behavior. It would return the first successful result, but it would run all functions in parallel which could cause unexpected side effects.

Since we introduced `branch` we never had a use case for `first` since we used `first` for adding conditional logic in our compositions which `branch` does much better.
We appreciate any feedback on this decision.

### collectSequence
We removed this function because even though ECMAScript guarantees the order of the keys in an object, to get this typing right is challenging.

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
We also removed the `merge` function because it was not a total function which meant that later dfs could override the previous ones.

You can easily achieve the same result with the `map` with `all` and `mergeObjects` functions like so:

```ts
// instead of
const df1 = mdf()(() => ({ firstName: 'John' }))
const df2 = mdf()(() => ({ lastName: 'Doe' }))
const df = merge(df1, df2)
//    ^? DomainFunction<{ firstName: string, lastName: string }>

// you can do
const fn1 = composable(() => ({ firstName: 'John' }))
const fn2 = composable(() => ({ lastName: 'Doe' }))
const fn = map(all(fn1, fn2), mergeObjects)
```

# Equivalence tables

#### Constructors
| Domain Functions | Composable Functions |
|---|---|
| `makeDomainFunction(z.string(), z.number())((input, env) => {})` | `withSchema(z.string, z.number())((input, env) => {})` |
| -- | `applySchema(composable((input, env) => {}), z.string(), z.number())` |
| `makeSuccessResult(1)` | `success(1)` |
| `makeErrorResult({ errors: [{ message: 'Something went wrong' }] })` | `failure([new Error('Something went wrong')])` |
| `new InputError('required', 'user.name')` | `new InputError('required', ['user', 'name'])` |
| `new EnvironmentError('oops', 'user.name')` | `new EnvironmentError('oops', ['user', 'name'])` |
| `new InputErrors([{ message: 'oops', path: 'user.name' }])` | `new ErrorList([new InputError('oops', ['user', 'name'])])` |
| `new ResultError({ inputErrors: [{ message: 'oops', path: 'user.name' }] })` | `new ErrorList([new InputError('oops', ['user', 'name'])])` |

#### Combinators
| Domain Functions | Composable Functions |
|---|---|
| `all(df1, df2)` | `all(fn1, fn2)` |
| `collect(df1, df2)` | `collect(fn1, fn2)` |
| `merge(df1, df2)` | `map(all(fn1, fn2), mergeObjects)` |
| `branch(df1, (res) => res ? null : df2)` | `environment.branch(fn1, (res) => res ? null : fn2)` |
| -- | `branch(fn1, (res) => res ? null : fn2)` without environment |
| `pipe(df1, df2)` | `environment.pipe(fn1, fn2)` |
| -- | `pipe(fn1, fn2)` without environment |
| `sequence(df1, df2)` | `environment.sequence(fn1, fn2)` |
| -- | `sequence(fn1, fn2)` without environment |
| `collectSequence({ name: nameDf, age: ageDf })` | `map(environment.sequence(nameDf, ageDf), ([name, age]) => ({ name, age }))` |
| `first(df1, df2)` | -- * read docs above |
| `safeResult(() => { throw new Error('oops') })` | `composable(() => { throw new Error('oops') })` |
| `mapError(df, (result) => ({ inputErrors: [], environmentErrors: [], errors: [{ message: 'Oops' }] }))` | `mapError(fn, errors => [new Error('Oops')])` |
| `trace(({ result, input, environment }) => console.log({ result, input, environment }))(df)` | `trace((result, ...args) => console.log(result, ...args))(fn)` |


#### Type utilities
| Domain Functions | Composable Functions |
|---|---|
| `DomainFunction<string>` | `Composable<(input?: unknown, environment?: unknown) => string>` |
| `SuccessResult<T>` | `Success<T>` |
| `ErrorResult` | `Failure` |
| `UnpackData<DomainFunction>` | `UnpackData<Composable>` |

#### Runtime code
| Domain Functions | Composable Functions |
|---|---|
| `{ success: true, data: { name: 'John' }, errors: [], inputErrors: [], environmentErrors: [] }` | `{ success: true, data: { name: 'John' }, errors: [] }` |
| `{ success: false, errors: [{ message: 'Something went wrong' }], inputErrors: [{ message: 'Required', path: ['name'] }], environemntErrors: [{ message: 'Unauthorized', path: ['user'] }] }` | `{ success: false, errors: [new Error('Something went wrong'), new InputError('Required', ['name']), new EnvironmentError('Unauthorized', ['user'])] }` |
| -- | with `serialize`: `{ success: false, errors: [{ message: 'Something went wrong', name: 'Error' }, { message: 'Required', name: 'InputError', path: ['name'] }, { message: 'Unauthorized', name: 'EnvironmentError', path: ['user'] }] }` |
