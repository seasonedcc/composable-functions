# API Reference
- [Constructors](#constructors)
  - [applySchema](#applyschema)
  - [composable](#composable)
  - [failure](#failure)
  - [fromSuccess](#fromsuccess)
  - [success](#success)
  - [withSchema](#withschema)
- [Combinators](#combinators)
  - [all](#all)
  - [branch](#branch)
  - [catchFailure](#catchfailure)
  - [collect](#collect)
  - [map](#map)
  - [mapErrors](#maperrors)
  - [mapParameters](#mapparameters)
  - [pipe](#pipe)
  - [sequence](#sequence)
  - [trace](#trace)
- [Input Resolvers](#input-resolvers)
  - [inputFromForm](#inputfromform)
  - [inputFromFormData](#inputfromformdata)
  - [inputFromUrl](#inputfromurl)
  - [inputFromSearch](#inputfromsearch)
- [Error Constructors and Handlers](#error-constructors-and-handlers)
  - [ErrorList](#errorlist)
  - [EnvironmentError](#environmenterror)
  - [InputError](#inputerror)
  - [isEnvironmentError](#isenvironmenterror)
  - [isInputError](#isinputerror)
- [Type-safe runtime utilities](#type-safe-runtime-utilities)
  - [mergeObjects](#mergeobjects)
- [Utility Types](#utility-types)
  - [Composable](#composable-1)
  - [Failure](#failure-1)
  - [Result](#result)
  - [Success](#success-1)
  - [UnpackData](#unpackdata)
- [Combinators with Environment](#combinators-with-environment)
  - [environment.branch](#environmentbranch)
  - [environment.pipe](#environmentpipe)
  - [environment.sequence](#environmentsequence)
- [Serialization](#serialization)
  - [serialize](#serialize)
  - [serializeError](#serializeerror)


# Constructors

## applySchema
It takes a composable and schemas for the input and environment, and returns the same composable with the schemas applied. So the types will be asserted at runtime.

It is useful when dealing with external data, such as API requests, where you want to ensure the data is in the correct shape before processing it.

```ts
const fn = composable((
  { greeting }: { greeting: string },
  { user }: { user: { name: string } },
) => ({
   message: `${greeting} ${user.name}`
}))

const safeFunction = applySchema(
  fn,
  z.object({ greeting: z.string() }),
  z.object({
    user: z.object({ name: z.string() })
  }),
)

type Test = typeof safeFunction
//   ^? Composable<(input?: unknown, env?: unknown) => { message: string }>
```

## composable
This is the primitive function to create composable functions. It takes a function and returns a composable function.

Note that a composition of composables is also a composable.

```ts
const add = composable((a: number, b: number) => a + b)
//    ^? Composable<(a: number, b: number) => number>
const toString = composable((a: unknown) => `${a}`)
//    ^? Composable<(a: unknown) => string>
const fn = pipe(add, toString)
//    ^? Composable<(a: number, b: number) => string>
```

All composables are asynchronous and need to be awaited and checked for success or failure.
```ts
const result = await fn(1, 2)
console.log(
  result.success ? result.data : `Can't process`
)
```

A composable will also catch any thrown errors and return them in a list as a failure.
```ts
const fn = composable((a: number) => {
  throw new Error('Something went wrong')
  return a * 2
})
const result = await fn(2)
console.log(result.errors[0].message)
// will log: 'Something went wrong'
```

## failure
`failure` is a helper function to create a `Failure` - aka: a failed result.

```ts
const result = failure([new Error('Something went wrong')])
//    ^? Failure
expect(result).toEqual({
  success: false,
  errors: [new Error('Something went wrong')]
})
```

## fromSuccess
It will unwrap a composable expecting it to succeed. If it fails, it will throw the errors.

It is useful when you want to call other composables from inside your current one and there's no combinator to express your desired logic.
```ts
// Using inside other composables
const fn = composable(async (id: string) => {
  const valueB = await fromSuccess(anotherComposable)({ userId: id })
  // do something else
  return { valueA, valueB }
})
```

It is also used to test the happy path of a composable.

```ts
const fn = map(pipe(add, multiplyBy2), (result) => result * 3)
const number = await fromSuccess(fn)(1, 1)
expect(number).toBe(12)
```

## success
`success` is a helper function to create a `Success` - aka: a successful result.

```ts
const result = success(42)
//    ^? Success<number>
expect(result).toEqual({
  success: true,
  data: 42
  errors: []
})
```

## withSchema
It creates a composable with unknown input and environment types, and applies the schemas to them so the arguments are assured at runtime.

See `applySchema` above for more information.

```ts
import { z } from 'zod'

const runtimeSafeAdd = withSchema(z.number(), z.number())((a, b) => a + b)
//    ^? Composable<(i?: unknown, e?: unknown) => number>
const result = await runtimeSafeAdd(1, 2)
console.log(result.success ? result.data : result.errors)
```

If there are input or environment errors, they will be returned in the `errors` property of the result.
```ts
const result = await runtimeSafeAdd('1', null)
// {
//   success: false,
//   errors: [
//     new InputError('Expected number, received string'),
//     new EnvironmentError('Expected number, received null')
//   ],
// }
```

# Combinators

These combinators are useful for composing composables. They all return another `Composable`, thus allowing further application in more compositions.

## all

`all` creates a single composable out of multiple composables.
It will pass the same arguments to each provided function.
If __all constituent functions__ are successful, The `data` field (on the composite function's result) will be a tuple containing each function's output.

```ts
const a = composable(({ id }: { id: number }) => String(id))
const b = composable(({ id }: { id: number }) => id + 1)
const c = composable(({ id }: { id: number }) => Boolean(id))

const result = await all(a, b, c)({ id: 1 })
//    ^? Result<[string, number, boolean]>
```

For the example above, the result will be:

```ts
{
  success: true,
  data: ['1', 2, true],
  errors: [],
}
```

If any of the constituent functions fail, the `errors` field (on the composite function's result) will be an array of the concatenated errors from each failing function:

```ts
const a = withSchema(z.object({ id: z.number() }))(({ id }) => {
  return String(id)
})
const b = composable(() => {
  throw new Error('Error')
})

const result = await all(a, b)({ id: '1' })
//    ^? Result<[string, never]>

/*{
  success: false,
  errors: [
    new InputError('Expected number, received null', ['id']),
    new Error('Error'),
  ],
}*/
```

## branch
Use `branch` to add conditional logic to your compositions.

It receives a composable and a predicate function that should return the next composable to be executed based on the previous function's output, like `pipe`.

```ts
const getIdOrEmail = composable((data: { id?: number, email?: string }) => {
  return data.id ?? data.email
})
const findUserById = composable((id: number) => {
  return db.users.find({ id })
})
const findUserByEmail = composable((email: string) => {
  return db.users.find({ email })
})
const findUserByIdOrEmail = branch(
  getIdOrEmail,
  (data) => (typeof data === "number" ? findUserById : findUserByEmail),
)
const result = await findUserByIdOrEmail({ id: 1 })
//    ^? Result<User>
```
For the example above, the result will be:
```ts
{
  success: true,
  data: { id: 1, email: 'john@doe.com' },
  errors: [],
}
```
If you don't want to pipe when a certain condition is matched, you can return `null` like so:
```ts
const a = composable(() => 'a')
const b = composable(() => 'b')
const fn = branch(a, (data) => data === 'a' ? null : b)
//    ^? Composable<() => 'a' | 'b'>
```

If any function fails, execution halts and the error is returned.
The predicate function will return a `Failure` in case it throws:
```ts
const findUserByIdOrEmail = branch(
  getIdOrEmail,
  (data) => {
    throw new Error("Invalid input")
  },
)
//    ^? Composable<({ id?: number, email?: string }) => never>
```
For the example above, the result type will be `Failure`:
```ts
{ success: false, errors: [new Error('Invalid input')] }
```

## catchFailure
You can catch an error in a `Composable`, using `catchFailure` which is similar to `map` but will run whenever the composable fails:

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

## collect

`collect` works like the `all` function but receives its constituent functions inside a record with string keys that identify each one. The shape of this record will be preserved for the `data` property in successful results.

The motivation for this is that an object with named fields is often preferable to long tuples, when composing many composables.

```ts
const a = composable(() => '1')
const b = composable(() => 2)
const c = composable(() => true)

const results = await collect({ a, b, c })({})
//    ^? Result<{ a: string, b: number, c: boolean }>
```

For the example above, the result will be:

```ts
{
  success: true,
  data: { a: '1', b: 2, c: true },
  errors: [],
}
```

As with the `all` function, in case any function fails their errors will be concatenated.

## map

`map` creates a single composable that will apply a transformation over the `result.data` of a successful `Composable`.
When the given composable fails, its error is returned wihout changes.
If successful, mapper will receive the output of the composable as input.

```ts
const add = composable((a: number, b: number) => a + b)
const addAndMultiplyBy2 = map(add, sum => sum * 2)
```

This can be useful when composing functions. For example, you might need to align input/output types in a pipeline:

```ts
const fetchAsText = composable(
  ({ userId }: { userId: number }) =>
    fetch(`https://reqres.in/api/users/${String(userId)}`).then((r) =>
      r.json(),
    ),
)
const fullName = withSchema(
  z.object({ first_name: z.string(), last_name: z.string() }),
)(({ first_name, last_name }) => `${first_name} ${last_name}`)

const fetchFullName = pipe(
  map(fetchAsText, ({ data }) => data),
  fullName,
)

const result = fetchFullName({ userId: 2 })
//    ^? Result<string>
```

For the example above, the result will be something like this:

```ts
{
  success: true,
  data: 'Janet Weaver',
  errors: [],
}
```

## mapErrors

`mapErrors` creates a single composable that will apply a transformation over the `Failure` of a failed `Composable`.
When the given composable succeeds, its result is returned without changes.

This could be useful when adding any layer of error handling.
In the example below, we are counting the errors but disregarding the contents:

```ts
const increment = composable((n: number) => {
  if (Number.isNaN(n)) {
    throw new Error('Invalid input')
  }
  return n + 1
})
const summarizeErrors = (errors: Error[]) =>
  [new Error('Number of errors: ' + errors.length)]

const incrementWithErrorSummary = mapErrors(increment, summarizeErrors)

const result = await incrementWithErrorSummary({ invalidInput: '1' })
```

For the example above, the `result` will be:

```ts
{
  success: false,
  errors: [new Error('Number of errors: 1')],
}
```

## mapParameters
It takes a Composable and a function that will map the input parameters to the expected input of the given Composable. Good to adequate the output of a composable into the input of the next composable in a composition. The function must return an array of parameters that will be passed to the Composable.

```ts
const getUser = composable(({ id }: { id: number }) => db.users.find({ id }))
//    ^? Composable<(input: { id: number }) => User>

const getCurrentUser = mapParameters(
  getUser,
  (_input, user: { id: number }) => [{ id: user.id }]
)
//    ^? Composable<(input: unknown, env: { id: number }) => User>
```

## pipe

`pipe` creates a single composable out of a chain of multiple composables.
It will pass the output of a function as the next function's input in left-to-right order.
The resulting data will be the output of the rightmost function.

```ts
const a = composable((aNumber: number) => String(aNumber))
const b = composable((aString: string) => aString == '1')
const c = composable((aBoolean: boolean) => !aBoolean)

const d = pipe(a, b, c)

const result = await d(1)
//    ^? Result<boolean>
```

For the example above, the result will be:

```ts
{
  success: true,
  data: false,
  errors: [],
}
```

If one functions fails, execution halts and the error is returned.

## sequence

`sequence` works exactly like the `pipe` function, except __the shape of the result__ is different.
Instead of the `data` field being the output of the last composable, it will be a tuple containing each intermediate output (similar to the `all` function).

```ts
const a = composable((aNumber: number) => String(aNumber))
const b = composable((aString: string) => aString == '1')
const c = composable((aBoolean: boolean) => !aBoolean)

const d = sequence(a, b, c)

const result = await d(1)
//    ^? Result<[string, boolean, boolean]>
```

For the example above, the result will be:

```ts
{
  success: true,
  data: ['1', true, false],
  errors: [],
}
```

If you'd rather have a sequential combinator that returns an object - similar to collect - instead of a tuple, you can use the `map` function like so:

```ts
const a = composable((aNumber: number) => String(aNumber))
const b = composable((aString: string) => aString === '1')

const c = map(sequence(a, b), ([a, b]) => ({ aString: a, aBoolean: b }))

const result = await c(1)
//    ^? Result<{ aString: string, aBoolean: boolean }>
```
## trace
Whenever you need to intercept inputs and a composable result without changing them, there is a function called `trace` that can help you.

The most common use case is to log failures to the console or to an external service. Let's say you want to log failed composables, you could create a function such as this:

```ts
const traceToConsole = trace((result, ...args) => {
  if(!context.result.success) {
    console.trace("Composable Failure ", result, ...args)
  }
})
```

The `args` above will be the tuple of arguments passed to the composable.

Then, assuming you want to trace all failures in a `otherFn`, you just need to wrap it with the `tracetoConsole` function:

```ts
traceToConsole(otherFn)
```

It would also be simple to create a function that will send the errors to some error tracking service under certain conditions:

```ts
const trackErrors = trace(async (result, ...args) => {
  if(!result.success && someOtherConditions(result)) {
    await sendToExternalService({ result, args })
  }
})
```

# Input Resolvers
We export some functions to help you extract values out of your requests before sending them as user input.

These functions are better suited for use with `withSchema` rather than `composable` since they deal with external data and `withSchema` will ensure type-safety in runtime.

## inputFromForm

`inputFromForm` will read a request's `FormData` and extract its values into a structured object:

```tsx
// Given the following form:
function Form() {
  return (
    <form method="post">
      <input name="email" value="john@doe.com" />
      <input name="password" value="1234" />
      <button type="submit">
        Submit
      </button>
    </form>
  )
}

async (request: Request) => {
  const values = await inputFromForm(request)
  // values = { email: 'john@doe.com', password: '1234' }
}
```

## inputFromFormData

`inputFromFormData` extracts values from a `FormData` object into a structured object:

```tsx
const formData = new FormData()
formData.append('email', 'john@doe.com')
formData.append('tasks[]', 'one')
formData.append('tasks[]', 'two')
const values = inputFromFormData(formData)
// values = { email: 'john@doe.com', tasks: ['one', 'two'] }
```

## inputFromUrl

`inputFromUrl` will read a request's query params and extract its values into a structured object:

```tsx
// Given the following form:
function Form() {
  return (
    <form method="get">
      <button name="page" value="2">
        Change URL
      </button>
    </form>
  )
}

async (request: Request) => {
  const values = inputFromUrl(request)
  // values = { page: '2' }
}
```
## inputFromSearch

`inputFromSearch` extracts values from a `URLSearchParams` object into a structured object:

```tsx
const qs = new URLSearchParams()
qs.append('colors[]', 'red')
qs.append('colors[]', 'green')
qs.append('colors[]', 'blue')
const values = inputFromSearch(qs)
// values = { colors: ['red', 'green', 'blue'] }
```

All of the functions above will allow structured data as follows:

```tsx
// Given the following form:
function Form() {
  return (
    <form method="post">
      <input name="numbers[]" value="1" />
      <input name="numbers[]" value="2" />
      <input name="person[0][email]" value="john@doe.com" />
      <input name="person[0][password]" value="1234" />
      <button type="submit">
        Submit
      </button>
    </form>
  )
}

async (request: Request) => {
  const values = await inputFromForm(request)
  /*
  values = {
    numbers: ['1', '2'],
    person: [{ email: 'john@doe.com', password: '1234' }]
  }
  */
}
```

# Error Constructors and Handlers
The `Failure` results contain a list of errors that can be of any extended class of `Error`.
To help with composables `withSchema` though, we provide some constructors that will help you create errors to differentiate between kinds of errors.

## ErrorList
An `ErrorList` is a special kind of error that carries a list of errors that can be used to represent multiple errors in a single result.

```ts
const fn = composable(() => {
  throw new ErrorList([
    new InputError('Custom input error', ['contact', 'id']),
    new EnvironmentError('Custom env error', ['currentUser', 'role']),
  ])
})
const result = await fn()
// {
//   success: false,
//   errors: [
//     new InputError('Custom input error', ['contact', 'id']),
//     new EnvironmentError('Custom env error', ['currentUser', 'role']),
//   ],
// }
```

## EnvironmentError
An `EnvironmentError` is a special kind of error that represents an error in the environment schema.

It has an optional second parameter that is an array of strings representing the path to the error in the environment schema.

```ts
const fn = withSchema(
  z.object({ id: z.number() }),
  z.object({
    user: z.object({ id: z.string() }),
  })
)(() => {})

const result = await fn({ id: '1' }, { user: { id: 1 } })
/* {
  success: false,
  errors: [
    new EnvironmentError(
      'Expected string, received number',
      ['user', 'id'],
    ),
  ],
} */
```

You can also use the `EnvironmentError` constructor to throw errors within the composable:

```ts
const fn = composable(() => {
  throw new EnvironmentError('Custom env error', ['currentUser', 'role'])
})
```

## InputError
Similar to `EnvironmentError`, an `InputError` is a special kind of error that represents an error in the input schema.

## isEnvironmentError
`isEnvironmentError` is a helper function that will check if an error is an instance of `EnvironmentError`.

```ts
isEnvironmentError(new EnvironmentError('yes')) // true
isEnvironmentError(new Error('nope')) // false
```

## isInputError
`isInputError` is a helper function that will check if an error is an instance of `InputError`.

```ts
isInputError(new InputError('yes')) // true
isInputError(new Error('nope')) // false
```

# Type-safe runtime utilities
## mergeObjects

`mergeObjects` merges an array of objects into one object, preserving type inference completely.
Object properties from the rightmost object will take precedence over the leftmost ones.

```ts
const a = { a: 1, b: 2 }
const b = { b: '3', c: '4' }
const result = mergeObjects([a, b])
//    ^? { a: number, b: string, c: string }
```
The resulting object will be:
```ts
{ a: 1, b: '3', c: '4' }
```

# Utility Types

## Composable
A `Composable` type represents a function that resturns a `Promise<Result<T>>`:

```ts
const fn = composable((a: number, b: number) => a + b)
type Test = typeof fn
//   ^? Composable<(a: number, b: number) => number>
type Test2 = ReturnType<typeof fn>
//   ^? Promise<Result<number>>
```

## Failure
A `Failure` type represents a failed result, which contains a list of errors and no data:

```ts
const f: Failure = {
  success: false,
  errors: [new Error('Something went wrong')],
}
```

## Result
A `Result<T>` type represents the result of a `Composable` function, which can be either a `Success<T>` or a `Failure`:

```ts
const r: Result<number> = {
  success: true,
  data: 42,
  errors: [],
}

const r2: Result<number> = {
  success: false,
  errors: [new Error('Something went wrong')],
}
```
## Success
A `Success<T>` type represents a successful result, which contains the data and an empty list of errors:

```ts
const s: Success<number> = {
  success: true,
  data: 42,
  errors: [],
}
```

## UnpackData

`UnpackData` infers the returned data of a successful composable function:

```ts
const fn = composable()(async () => 'hey')

type Data = UnpackData<typeof fn>
//   ^? string
```

# Combinators with Environment
The environment is a concept of an argument that is passed to every functions of a sequential composition. When it comes to parallel compositions, all arguments are already forwarded to every function.

However in sequential compositions, we need a set of special combinators that will forward the environment - the second parameter - to every function in the composition.

Use the sequential combinators from the namespace `environment` to get this behavior.

For a deeper explanation check the [`environment` docs](./environments.md).

## environment.branch
It is the same as `branch` but it will forward the environment to the next composable.

```ts
import { environment } from 'composable-functions'

const getIdOrEmail = composable((data: { id?: number, email?: string }) => {
  return data.id ?? data.email
})
const findUserById = composable((id: number, env: { user: User }) => {
  if (!env.user.admin) {
    throw new Error('Unauthorized')
  }
  return db.users.find({ id })
})
const findUserByEmail = composable((email: string, env: { user: User }) => {
  if (!env.user.admin) {
    throw new Error('Unauthorized')
  }
  return db.users.find
})
const findUserByIdOrEmail = environment.branch(
  getIdOrEmail,
  (data) => (typeof data === "number" ? findUserById : findUserByEmail),
)
const result = await findUserByIdOrEmail({ id: 1 }, { user: { admin: true } })
```
## environment.pipe
Similar to `pipe` but it will forward the environment to the next composable.

```ts
import { environment } from 'composable-functions'

const a = composable((aNumber: number, env: { user: User }) => String(aNumber))
const b = composable((aString: string, env: { user: User }) => aString == '1')
const c = composable((aBoolean: boolean, env: { user: User }) => aBoolean && env.user.admin)

const d = environment.pipe(a, b, c)

const result = await d(1, { user: { admin: true } })
```

## environment.sequence
Similar to `sequence` but it will forward the environment to the next composable.

```ts
import { environment } from 'composable-functions'

const a = composable((aNumber: number, env: { user: User }) => String(aNumber))
const b = composable((aString: string, env: { user: User }) => aString === '1')
const c = composable((aBoolean: boolean, env: { user: User }) => aBoolean && env.user.admin)

const d = environment.sequence(a, b, c)

const result = await d(1, { user: { admin: true } })
```

# Serialization
In distributed systems where errors might be serialized across network boundaries, it is important to preserve information relevant to error handling.

## serialize
When serializing a `Result` to send over the wire, some of the `Error[]` information is lost.

To solve that you may use the `serialize` helper that will turn the error list into a serializable format:

```ts
const serializedResult = JSON.stringify(serialize({
  success: false,
  errors: [new InputError('Oops', ['name'])],
}))

// serializedResult is:
`"{ success: false, errors: [{ message: 'Oops', name: 'InputError', path: ['name'] }] }"`
```

The resulting type is `SerializableResult` which means `Success<T> | { success: false, errors: SerializableError[] }`.

Therefore, you can differentiate the error using names and paths.

## serializeError
`serializeError` is a helper function that will convert a single `Error` into a `SerializableError` object. It is used internally by `serialize`:

```ts
const serialized = JSON.stringify(
  serializeError(new InputError('Oops', ['name']))
)

// serialized is:
`"{ message: 'Oops', name: 'InputError', path: ['name'] }"`
```
