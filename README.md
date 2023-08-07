# Keep your business logic clean with Domain Functions

Domain Functions helps you decouple your business logic from your controllers, with first-class type inference from end to end.
It does this by enforcing the parameters' types at runtime (through [zod](https://github.com/colinhacks/zod#what-is-zod) schemas) and always wrapping results (even exceptions) into a `Promise<Result<Output>>` type.

![](example.gif)

## Table of contents

- [Benefits](#benefits)
- [Quickstart](#quickstart)
- [Using Deno](#using-deno)
- [Create your first action with Remix](#create-your-first-action-with-remix)
- [Taking parameters that are not user input](#taking-parameters-that-are-not-user-input)
- [Dealing with errors](#dealing-with-errors)
  - [Changing the ErrorResult with Custom Errors](#changing-the-errorresult-with-custom-errors)
  - [ResultError constructor](#resulterror-constructor)
  - [Other error constructors](#other-error-constructors)
  - [Using error messages in the UI](#using-error-messages-in-the-ui)
    - [errorMessagesFor](#errormessagesfor)
    - [errorMessagesForSchema](#errormessagesforschema)
  - [Tracing](#tracing)
- [Combining domain functions](#combining-domain-functions)
  - [all](#all)
  - [collect](#collect)
  - [first](#first)
  - [pipe](#pipe)
  - [branch](#branch)
  - [sequence](#sequence)
  - [map](#map)
  - [mapError](#maperror)
- [Runtime utilities](#runtime-utilities)
  - [fromSuccess](#fromsuccess)
  - [mergeObjects](#mergeobjects)
- [Improve type inference with Utility Types](#improve-type-inference-with-utility-types)
  - [UnpackData](#unpackdata)
  - [UnpackSuccess](#unpacksuccess)
  - [UnpackResult](#unpackresult)
- [Extracting input values for domain functions](#extracting-input-values-for-domain-functions)
  - [inputFromForm](#inputfromform)
  - [inputFromFormData](#inputfromformdata)
  - [inputFromUrl](#inputfromurl)
  - [inputFromSearch](#inputfromsearch)
- [Resources](#resources)
- [FAQ](#faq)
- [Acknowlegements](#acknowlegements)

## Benefits

- Provides end-to-end type safety, all the way from the Backend to the UI
- Removes the "plumbing": Extracting and parsing structured data from your Requests
- Keeps your domain functions decoupled from the framework, with the assurance that your values conform to your types
- Facilitates easier testing and maintainence of business logic
- Allows business logic to be expressed in the type system

## Quickstart

```
npm i domain-functions zod
```

```tsx
import { makeDomainFunction, inputFromForm } from 'domain-functions'
import * as z from 'zod'

const schema = z.object({ number: z.coerce.number() })
const increment = makeDomainFunction(schema)(({ number }) => number + 1)

const result = await increment({ number: 1 })
/*
result = {
  success: true,
  data: 2,
  errors: []
  inputErrors: []
  environmentErrors: []
}
*/
const failedResult = await increment({ number: 'foo' })
/*
failedResult = {
  success: false,
  inputErrors: [{ path: ['number'], message: 'Expected number, received nan' }],
  environmentErrors: []
  errors: [],
}
*/
```

To understand how to build the schemas, refer to [Zod documentation](https://github.com/colinhacks/zod#defining-schemas).

## Using Deno

If you are using [Deno](https://deno.land/), just directly import the functions you need from [deno.land/x](https://deno.land/x):

```ts
import { makeDomainFunction } from "https://deno.land/x/domain_functions/mod.ts";
```

This documentation will use Node.JS imports by convention, just replace `domain-functions` with `https://deno.land/x/domain_functions/mod.ts` when using [Deno](https://deno.land/).

## Create your first action with Remix

```tsx
import type { ActionFunction } from 'remix'
import { useActionData, redirect } from 'remix'
import { makeDomainFunction, inputFromForm } from 'domain-functions'
import * as z from 'zod'

const schema = z.object({ number: z.coerce.number() })

export const action: ActionFunction = async ({ request }) => {
  const increment = makeDomainFunction(schema)(({ number }) => number + 1)
  const result = await increment(await inputFromForm(request))

  if (!result.success) return result

  return redirect('/')
}

export default function Index() {
  const actionData = useActionData()

  return (
    <Form method="post">
      <input name="number" type="number" />
      {actionData.inputErrors && (
        <span role="alert">{actionData.inputErrors[0].message}</span>
      )}
      <button type="submit">
        Submit
      </button>
    </Form>
  )
}
```

## Taking parameters that are not user input

Sometimes you want to ensure the safety of certain values that weren't explicitly sent by the user. We call them _environment_:

```tsx
// In some app/domain/*.server.ts file
const sendEmail = makeDomainFunction(
  z.object({ email: z.string().email() }), // user input schema
  z.object({ origin: z.string() }) // environment schema
)(
  async ({ email }, { origin }) => {
    mailer.send({
      email,
      message: `Link to reset password: ${origin}/reset-password`
    })
  }
)

// In your controller:
async ({ request }) => {
  const environment = (request: Request) => ({
    origin: new URL(request.url).origin,
  })

  await sendEmail(
    await inputFromForm(request),
    environment(request),
  )
}
```

We usually use the environment for ensuring authenticated requests.
In this case, assume you have a `currentUser` function that returns the authenticated user:

```tsx
const dangerousFunction = makeDomainFunction(
  someInputSchema,
  z.object({ user: z.object({ id: z.string(), admin: z.literal(true) }) })
)(async (input, { user }) => {
  // do something that only the admin can do
})
```

## Dealing with errors

The error result has the following structure:

```ts
type ErrorResult = {
  success: false
  errors: ErrorWithMessage[]
  inputErrors: SchemaError[]
  environmentErrors: SchemaError[]
}
```

The `inputErrors` and `environmentErrors` fields will be the errors from parsing the corresponding Zod schemas, and the `errors` field will be for any exceptions thrown inside the domain function (in which case we keep a reference to the original exception):

```ts
const alwaysFails = makeDomainFunction(input, environment)(async () => {
  throw new Error('Some error')
})

const failedResult = await alwaysFails(someInput)
/*
failedResult = {
  success: false,
  errors: [{ message: 'Some error', exception: instanceOfError }],
  inputErrors: [],
  environmentErrors: [],
}
*/
```

### Changing the ErrorResult with Custom Errors

### ResultError constructor

Whenever you want more control over the domain function's `ErrorResult`, you can throw a `ResultError` from the domain function's handler. You will then be able to add multiple error messages to the structure:

```ts
const alwaysFails = makeDomainFunction(inputSchema)(async () => {
  throw new ResultError({
    errors: [{ message: 'Some error' }],
    inputErrors: [{ path: ['number'], message: 'Expected number, received nan' }],
    environmentErrors: [], // you can optionally omit this as it is empty.
  })
})
```

### Other error constructors

You can also throw an `InputError` whenever you want a custom input error that cannot be generated by your schema.

```ts
const alwaysFails = makeDomainFunction(input, environment)(async () => {
  throw new InputError('Email already taken', 'email')
})

const failedResult = await alwaysFails(someInput)
/*
failedResult = {
  success: false,
  errors: [],
  inputErrors: [{ message: 'Email already taken', path: ['email'] }],
  environmentErrors: [],
}
*/
```

To throw several input errors at once, you can use the pluralized version `InputErrors` like this:

```ts
const alwaysFails = makeDomainFunction(input, environment)(async () => {
  throw new InputErrors([{message: 'Email already taken', path: 'email'}, {message: 'Password too short', path: 'password'}])
})

const failedResult = await alwaysFails(someInput)
/*
failedResult = {
  success: false,
  errors: [],
  inputErrors: [{ message: 'Email already taken', path: ['email'] }, { message: 'Password too short', path: ['password'] }],
  environmentErrors: [],
}
*/
```

You can also return a custom environment error by throwing an `EnvironmentError`.

### Using error messages in the UI

To improve DX when dealing with errors, we export a couple of utilities.

#### errorMessagesFor

Given an array of `SchemaError` -- be it from `inputErrors` or `environmentErrors` -- and a name, `errorMessagesFor` returns an array of error messages with that name in their path.

```tsx
const result = {
  success: false,
  errors: [],
  inputErrors: [],
  environmentErrors: [{ message: 'Must not be empty', path: ['host'] }, { message: 'Must be a fully qualified domain', path: ['host'] }]
}

errorMessagesFor(result.inputErrors, 'email') // will be an empty array: []
errorMessagesFor(result.environmentErrors, 'host')[0] === 'Must not be empty'
```

#### errorMessagesForSchema

Given an array of `SchemaError` -- be it from `inputErrors` or `environmentErrors` -- and a Zod Schema, `errorMessagesForSchema` returns an object with a list of error messages for each key in the schema's shape.

```tsx
const schema = z.object({ email: z.string().nonEmpty(), password: z.string().nonEmpty() })
const result = {
  success: false,
  errors: [],
  inputErrors: [{ message: 'Must not be empty', path: ['email'] }, { message: 'Must be a string', path: ['email'] }, { message: 'Must not be empty', path: ['password'] }],
  environmentErrors: []
}

errorMessagesForSchema(result.inputErrors, schema)
/*
{
  email: ['Must not be empty', 'Must be a string'],
  password: ['Must not be empty']
}
*/
```

### Tracing

Whenever you need to intercept inputs and a domain function result without changing them, there is a function called `trace` that can help you.

The most common use case is to log failures to the console or to an external service. Let's say you want to log failed domain functions, you could create a function such as this:

```ts
const traceToConsole = trace((context) => {
  if(!context.result.success) {
    console.trace("Domain Function Failure ", context)
  }
})
```

Then, assuming you want to trace all failures in a `someOtherDomainFunction`, you just need to pass that domain function to our `tracetoConsole` function:

```ts
traceToConsole(someOtherDomainFunction)()
```

It would also be simple to create a function that will send the errors to some error tracking service under certain conditions:

```ts
const trackErrors = trace(({ input, output, result }) => {
  if(!result.success && someOtherConditions(result)) {
    sendToExternalService({ input, output, result })
  }
})
```

## Combining domain functions

These combinators are useful for composing domain functions. They all return another `DomainFunction`, thus allowing further application in more compositions.

### all

`all` creates a single domain function out of multiple domain functions.
It will pass the same input and environment to each provided function.
If __all constituent functions__ are successful, The `data` field (on the composite domain function's result) will be a tuple containing each function's output.

```ts
const a = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => String(id))
const b = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => id + 1)
const c = makeDomainFunction(z.object({ id: z.number() }))(({ id }) => Boolean(id))

const results = await all(a, b, c)({ id: 1 })
```

For the example above, the result type will be `Result<[string, number, boolean]>`:

```ts
{
  success: true,
  data: ['1', 2, true],
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```

If any of the constituent functions fail, the `errors` field (on the composite domain function's result) will be an array of the concatenated errors from each failing function:

```ts
const a = makeDomainFunction(z.object({ id: z.number() }))(() => {
  throw new Error('Error A')
})
const b = makeDomainFunction(z.object({ id: z.number() }))(() => {
  throw new Error('Error B')
})

const results = await all(a, b)({ id: 1 })

/*{
  success: false,
  errors: [
    { message: 'Error A', exception: instanceOfErrorA },
    { message: 'Error B', exception: instanceOfErrorB }
  ],
  inputErrors: [],
  environmentErrors: [],
}*/
```

### collect

`collect` works like the `all` function but receives its constituent functions inside a record with string keys that identify each one. The shape of this record will be preserved for the `data` property in successful results.

The motivation for this is that an object with named fields is often preferable to long tuples, when composing many domain functions.

```ts
const a = makeDomainFunction(z.object({}))(() => '1')
const b = makeDomainFunction(z.object({}))(() => 2)
const c = makeDomainFunction(z.object({}))(() => true)

const results = await collect({ a, b, c })({})
```

For the example above, the result type will be `Result<{ a: string, b: number, c: boolean }>`:

```ts
{
  success: true,
  data: { a: '1', b: 2, c: true },
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```

As with the `all` function, in case any function fails their errors will be concatenated.

### first

`first` will create a composite domain function that will return the result of the first successful constituent domain function. It handles inputs and environments like the `all` function.
__It is important to notice__ that all constituent domain functions will be executed in parallel, so be mindful of the side effects.

```ts
const a = makeDomainFunction(
  z.object({ n: z.number(), operation: z.literal('increment') }),
)(({ n }) => n + 1)
const b = makeDomainFunction(
  z.object({ n: z.number(), operation: z.literal('decrement') }),
)(({ n }) => n - 1)

const result = await first(a, b)({ n: 1, operation: 'increment' })
```

For the example above, the result type will be `Result<number>`:

```ts
{
  success: true,
  data: 2,
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```

The composite domain function's result type will be a union of each constituent domain function's result type.

```ts
const a = makeDomainFunction(z.object({ operation: z.literal('A') }))(() => ({
  resultA: 'A',
}))
const b = makeDomainFunction(z.object({ operation: z.literal('B') }))(() => ({
  resultB: 'B',
}))

const result = await first(a, b)({ operation: 'A' })
//       ^-- Result<{ resultA: string } | { resultB: string }>
if (!result.success) return console.log('No function was successful')
if ('resultA' in result.data) return console.log('function A succeeded')
return console.log('function B succeeded')
```

If every constituent domain function fails, the `errors` field will contain the concatenated errors from each failing function's result:

```ts
const a = makeDomainFunction(z.object({ id: z.number() }))(() => {
  throw new Error('Error A')
})
const b = makeDomainFunction(z.object({ id: z.number() }))(() => {
  throw new Error('Error B')
})

const result = await first(a, b)({ id: 1 })

/*{
  success: false,
  errors: [
    { message: 'Error A', exception: instanceOfErrorA },
    { message: 'Error B', exception: instanceOfErrorB }
  ],
  inputErrors: [],
  environmentErrors: [],
}*/
```

### pipe

`pipe` creates a single domain function out of a chain of multiple domain functions.
It will pass the same environment to all given functions, and it will pass the output of a function as the next function's input in left-to-right order.
The resulting data will be the output of the rightmost function.

Note that there is no type-level assurance that a function's output will align with and be succesfully parsed by the next function in the pipeline.

```ts
const a = makeDomainFunction(z.object({ aNumber: z.number() }))(
  ({ aNumber }) => ({
    aString: String(aNumber),
  }),
)
const b = makeDomainFunction(z.object({ aString: z.string() }))(
  ({ aString }) => ({
    aBoolean: aString == '1',
  }),
)
const c = makeDomainFunction(z.object({ aBoolean: z.boolean() }))(
  async ({ aBoolean }) => !aBoolean,
)

const d = pipe(a, b, c)

const result = await d({ aNumber: 1 })
```

For the example above, the result type will be `Result<boolean>`:

```ts
{
  success: true,
  data: false,
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```

If one functions fails, execution halts and the error is returned.

### sequence

`sequence` works exactly like the `pipe` function, except __the shape of the result__ is different.
Instead of the `data` field being the output of the last domain function, it will be a tuple containing each intermediate output (similar to the `all` function).

```ts
const a = makeDomainFunction(z.number())((aNumber) => String(aNumber))
const b = makeDomainFunction(z.string())((aString) => aString === '1')

const c = sequence(a, b)

const result = await c(1)
```

For the example above, the result type will be `Result<[string, boolean]>`:

```ts
{
  success: true,
  data: ['1', true],
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```

If you'd rather have an object instead of a tuple (similar to the `merge` function), you can use the `map` and `mergeObjects` functions like so:

```ts
import { mergeObjects } from 'domain-functions'

const a = makeDomainFunction(z.number())((aNumber) => ({
  aString: String(aNumber)
}))
const b = makeDomainFunction(z.object({ aString: z.string() }))(
  ({ aString }) => ({ aBoolean: aString === '1' })
)

const c = map(sequence(a, b), mergeObjects)

const result = await c(1)
```

For the example above, the result type will be `Result<{ aString: string, aBoolean: boolean }>`.

### branch

Use `branch` to add conditional logic to your domain functions' compositions.

It receives a domain function and a predicate function that should return the next domain function to be executed based on the previous domain function's output.

```ts
const getIdOrEmail = makeDomainFunction(z.object({ id: z.number().optional, email: z.string().optional() }))((data) => {
  return data.id ?? data.email
})
const findUserById = makeDomainFunction(z.number())((id) => {
  return db.users.find({ id })
})
const findUserByEmail = makeDomainFunction(z.string().email())((email) => {
  return db.users.find({ email })
})
const findUserByIdOrEmail = branch(
  getIdOrEmail,
  (output) => (typeof output === "number" ? findUserById : findUserByEmail),
)
const result = await findUserByIdOrEmail({ id: 1 })
```
For the example above, the result type will be `Result<User>`:
```ts
{
  success: true,
  data: { id: 1, email: 'john@doe.com' },
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```
If any function fails, execution halts and the error is returned.
The predicate function will return an `ErrorResult` type in case it throws:
```ts
const findUserByIdOrEmail = branch(
  getIdOrEmail,
  (output) => {
    throw new Error("Invalid input")
  },
)
```
For the example above, the result type will be `ErrorResult`:
```ts
{
  success: false,
  errors: [{ message: 'Invalid input' }],
  inputErrors: [],
  environmentErrors: [],
}
```

### map

`map` creates a single domain function that will apply a transformation over the `result.data` of a successful `DomainFunction`.
When the given domain function fails, its error is returned wihout changes.
If successful, the `data` field will contain the output of the first function argument, mapped using the second function argument.

This can be useful when composing domain functions. For example, you might need to align input/output types in a pipeline:

```ts
const fetchAsText = makeDomainFunction(z.object({ userId: z.number() }))(
  ({ userId }) =>
    fetch(`https://reqres.in/api/users/${String(userId)}`).then((r) =>
      r.json(),
    ),
)

const fullName = makeDomainFunction(
  z.object({ first_name: z.string(), last_name: z.string() }),
)(({ first_name, last_name }) => `${first_name} ${last_name}`)

const fetchFullName = pipe(
  map(fetchAsText, ({ data }) => data),
  fullName,
)

const result = fetchFullName({ userId: 2 })
```

For the example above, the result type will be `Result<string>` and its value something like this:

```ts
{
  success: true,
  data: 'Janet Weaver',
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```

### mapError

`mapError` creates a single domain function that will apply a transformation over the `ErrorResult` of a failed `DomainFunction`.
When the given domain function succeeds, its result is returned without changes.

This could be useful when adding any layer of error handling.
In the example below, we are counting the errors but disregarding the contents:

```ts
const increment = makeDomainFunction(z.object({ id: z.number() }))(
  ({ id }) => id + 1,
)

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

const result = await incrementWithErrorSummary({ invalidInput: '1' })
```

For the example above, the `result` will be:

```ts
{
  success: false,
  errors: [{ message: 'Number of errors: 0' }],
  inputErrors: [{ message: 'Number of input errors: 1' }],
  environmentErrors: [{ message: 'Number of environment errors: 0' }],
}
```

## Runtime utilities

### fromSuccess

Whenever the composition utilities fall short, and you want to call other domain functions from inside your current one, you can use the `fromSuccess` function to create a domain function that is expected to always succeed.

```ts
const domainFunctionA = makeDomainFunction(
  z.object({ id: z.string() }),
)(async ({ id }) => {
  const valueB = await fromSuccess(domainFunctionB)({ userId: id })
  // do something else
  return {
    valueA,
    valueB,
  }
})
```

Otherwise, if the domain function passed to `fromSuccess` happens to fail, the error will be bubbled up exactly as it was thrown.

### mergeObjects

`mergeObjects` merges an array of objects into one object, preserving type inference completely.
Object properties from the rightmost object will take precedence over the leftmost ones.

```ts
const a = { a: 1, b: 2 }
const b = { b: '3', c: '4' }
const result = mergeObjects([a, b])
```
The resulting object will be:
```ts
{ a: 1, b: '3', c: '4' }
// inferred as { a: number, b: string, c: string }
```



## Improve type inference with Utility Types

### UnpackData

`UnpackData` infers the returned data of a successful domain function:

```ts
const fn = makeDomainFunction()(async () => '')

type Data = UnpackData<typeof fn>
// Data = string
```

### UnpackSuccess

`UnpackSuccess` infers the success result of a domain function:

```ts
const fn = makeDomainFunction()(async () => '')

type Success = UnpackSuccess<typeof fn>
// Success = { success: true, data: string, errors: [], inputErrors: [], environmentErrors: [] }
// Which is the same as: SuccessResult<string>
```
### UnpackResult

`UnpackResult` infers the result of a domain function:

```ts
const fn = makeDomainFunction()(async () => '')

type Result = UnpackResult<typeof fn>
/*
Result =
  | { success: true, data: string, errors: [], inputErrors: [], environmentErrors: [], }
  | { success: false, errors: { message: string }[], inputErrors: SchemaError[], environmentErrors: SchemaError[] }

* Which is the same as:
Result<string>
* Which is the same as:
SuccessResult<string> | ErrorResult
*/
```


## Extracting input values for domain functions

We export some functions to help you extract values out of your requests before sending them as user input.

### inputFromForm

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

### inputFromFormData

`inputFromFormData` extracts values from a `FormData` object into a structured object:

```tsx
const formData = new FormData()
formData.append('email', 'john@doe.com')
formData.append('tasks[]', 'one')
formData.append('tasks[]', 'two')
const values = inputFromFormData(formData)
// values = { email: 'john@doe.com', tasks: ['one', 'two'] }
```

### inputFromUrl

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
### inputFromSearch

`inputFromSearch` extracts values from a `URLSearchParams` object into a structured object:

```tsx
const qs = new URLSearchParams()
qs.append('colors[]', 'red')
qs.append('colors[]', 'green')
qs.append('colors[]', 'blue')
const values = inputFromSearch(qs)
// values = { colors: ['red', 'green', 'blue'] }
```

All of the functions above will parse the input using [`qs`](https://www.npmjs.com/package/qs), thus allowing structured data as follows:

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

To better understand how to structure your data, refer to [qs documentation](https://github.com/ljharb/qs#parsing-objects)

## Resources

- [The case for domain-functions](https://dev.to/diogob/the-case-for-domain-functions-f4e)
- [How domain-functions improves the already awesome DX of Remix projects](https://dev.to/gugaguichard/how-remix-domains-improves-the-already-awesome-dx-of-remix-projects-56lm)

## FAQ
- Why are the inputs and the environment not type-safe?
  - Short answer: Similar to how zod's `.parse` operates, we won't presume you're providing the right data to the domain function. We will validate it only at runtime. The domain function's inner code won't execute if the input/environment is invalid, ensuring that the data you receive is valid. Once validated, we can also infer the output type. Read more about it in [@danielweinmann 's comment](https://github.com/seasonedcc/domain-functions/issues/80#issuecomment-1642453221).
- How do I carry out conditional branching in a composition of domain functions?
  - Before 1.8.0: You would have to use either the [`first`](#first) operator or `if` statements within the function. The `first` operator was not ideal because it could execute all the functions in the composition (assuming the input and environment validate) until one of them returns a success. For the `if` approach, we'd recommend using [`fromSuccess`](#fromsuccess) to invoke the other domain functions, as it would propagate any errors that could occur within them. Read more about it [here](https://twitter.com/gugaguichard/status/1684280544387899393).
  - After 1.8.0: We introduced the [`branch`](#branch) operator, which enables you to conduct more complex conditional branching without breaking compositions.

## Acknowlegements

We are grateful for [Zod](https://github.com/colinhacks/zod), as it is a great library and it informed our design.
It's worth mentioning two other projects that inspired domain-functions:

- [Servant](https://github.com/haskell-servant/servant/)
- [tRPC](https://trpc.io)
