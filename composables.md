# Composables

## Composing type-safe functions
Let's say we ant to compose two functions: `add : (a: number, b:number) => number` and `toString : (a: number) => string`. We also want the composition to preserve the types, we can continue living in the happy world of type-safe coding, the result would be a function that adds and converts the result to string, something like `addAndReturnString : (a: number, b: number) => string`.

Performing this operation manually is straightforward

```typescript
function addAndReturnString(a: number, b: number) : string {
  return toString(add(a, b))
}
``` 

It would be neat if typescript could the typing for us and provided a more generic mechanism to compose these functions. Something like what you find in libraries such as [lodash](https://lodash.com/docs/4.17.15#flow)

Using composables the code could be written as:

```typescript
const addAndReturnString = pipe(add, toString)
``` 

We can also extend the same reasoning to functions that return promises in a transparent way. Imagine we have `add : (a: number, b:number) => Promise<number>` and `toString : (a: number) => Promise<string>`, the composition above would work in the same fashion, returning a function `addAndReturnString(a: number, b: number) : Promise<string>` that will wait for each promise in the chain before applying the next function.

This library also defines several operations besides the `pipe` to compose functions in arbitrary ways, giving a powerful tool for the developer to reason about the data flow without worrying about mistakenly connecting the wrong parameters or forgetting to unwrap some promise or handle some error along the way.

## Creating primitive composables

A `Composable` is a function that returns a `Promise<Result<T>>` where `T` is any type you want to return. Values of the type `Result` will represent either a failure (which carries a list of errors) or a success, where the computation has returned a value within the type `T`.

So we can define the `add` and the `toString` functions as a `Composable`:

```typescript
const add = composable((a: number, b: number) => a + b)
        ^? Composable<(a: number, b: number) => number>

const toString = composable((a: unknown) => `${a}`)
```

Now we can compose them using pipe to create `addAndReturnString`:

```typescript
const addAndReturnString = pipe(add, toString)
       ^? Composable<(a: number, b: number) => string>
```

Note that trying to compose pipe flipping the arguments will not type-check:

```typescript
const addAndReturnString = pipe(toString, add)
       ^? ["Fail to compose", string, "does not fit in", number]
```

The error message comes in the form of an inferred type (the type checker error is a bit more cryptic).
Since pipe will compose from left to right, the only `string` output from `toString` will not fit into the first argument of `add` which is a `number`.

## Handling errors
> Quick motivation for having Composables return an error over dealing with exceptions
 
### Catching errors
> We still dont have a catch combinator, but it would make a lot of sense and it seems more relevant than error mapping.

### Mapping errors
> Motivation and example for mapping errors

## Sequential composition
> Here we explain 

### Using non-composables (mapping)

## Parallel composition

