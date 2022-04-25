# Remix Domains

Remix Domains helps you to keep your Business Logic appart from your Remix Actions/Loaders plumbing and gives you first class type inference from end to end.
It does this by enforcing the parameters' types in runtime (through [zod](https://github.com/colinhacks/zod#what-is-zod) schemas) and always wrapping results (even exceptions) into a `Promise<Result<Output>>` type.

![](example.gif)

## Table of contents

- [Remix Domains](#remix-domains)
  - [Table of contents](#table-of-contents)
  - [Benefits](#benefits)
  - [Quickstart](#quickstart)
  - [Create your first action with Remix](#create-your-first-action-with-remix)
  - [Taking parameters that are not user input](#taking-parameters-that-are-not-user-input)
  - [Dealing with errors](#dealing-with-errors)
    - [Custom Error constructors](#custom-error-constructors)
  - [Type Utilities](#type-utilities)
    - [UnpackData](#unpackdata)
    - [UnpackSuccess](#unpacksuccess)
    - [UnpackResult](#unpackresult)
  - [Combining domain functions](#combining-domain-functions)
    - [all](#all)
    - [pipe](#pipe)
    - [map](#map)
    - [mapError](#maperror)
  - [Input Utilities](#input-utilities)
    - [inputFromForm](#inputfromform)
    - [inputFromFormData](#inputfromformdata)
    - [inputFromUrl](#inputfromurl)
    - [inputFromSearch](#inputfromsearch)
  - [Error Utilities](#error-utilities)
    - [errorMessagesFor](#errormessagesfor)
    - [errorMessagesForSchema](#errormessagesforschema)
  - [Acknowlegements](#acknowlegements)

## Benefits
- End-to-End typesafety all the way from the Backend to the UI
- Keep your Remix Actions and Loaders slim and tidy
- Removes the plumbing of extracting and parsing structured data from your Requests
- Keep your domain functions decoupled from the framework, with the assurance that your values conform to your types
- Easier to test and maintain business logic
- Business Logic can be expressed in the type system

## Quickstart

```
npm i remix-domains zod
```

```tsx
import { makeDomainFunction, inputFromForm } from 'remix-domains'
import * as z from 'zod'

const schema = z.object({ number: z.preprocess(Number, z.number()) })
const increment = makeDomainFunction(schema)(async ({ number }) => number + 1)

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

## Create your first action with Remix
```tsx
import type { ActionFunction } from 'remix'
import { useActionData, redirect } from 'remix'
import { makeDomainFunction, inputFromForm } from 'remix-domains'
import * as z from 'zod'

const schema = z.object({ number: z.preprocess(Number, z.number()) })
const increment = makeDomainFunction(schema)(({ number }) => number + 1)

export const action: ActionFunction = async ({ request }) => {
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

// In your Remix action:
export const action = async ({ request }) => {
  const environment = (request: Request) => ({
    origin: new URL(request.url).origin,
  })

  await sendResetToken(
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
  errors: { message: string }[]
  inputErrors: SchemaError[]
  environmentErrors: SchemaError[]
}
```

Where `inputErrors` and `environmentErrors` will be the errors from parsing the corresponding Zod schemas and `errors` will be for any exceptions thrown inside the domain function:

```ts
const alwaysFails = makeDomainFunction(input, environment)(async () => {
  throw new Error('Some error')
})

const failedResult = await alwaysFails(someInput)
/*
failedResult = {
  success: false,
  errors: [{ message: 'Some error' }],
  inputErrors: [],
  environmentErrors: [],
}
*/
```

### Custom Error constructors

Or you can throw an `InputError` whenever you want a custom input error that cannot be generated by your schema.

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

The same can be done for environment errors by throwing an `EnvironmentError`.

## Type Utilities

### UnpackData
It infers the returned data of a successful domain function:
```ts
const fn = makeDomainFunction()(async () => '')

type Data = UnpackData<typeof fn>
// Data = string
```

### UnpackSuccess
It infers the success result of a domain function:
```ts
const fn = makeDomainFunction()(async () => '')

type Success = UnpackSuccess<typeof fn>
// Success = { success: true, data: string, errors: [], inputErrors: [], environmentErrors: [] }
// Which is the same as: SuccessResult<string>
```
### UnpackResult
It infers the result of a domain function:
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


## Combining domain functions

### all

It creates a single domain function out of multiple domain functions.
It will pass the same input and environment to all given functions.
The resulting data is going to be a tuple of the results of each function only when __all functions__ are successful.
```ts
const a = makeDomainFunction(z.object({ id: z.number() }))(async ({ id }) => String(id))
const b = makeDomainFunction(z.object({ id: z.number() }))(async ({ id }) => id + 1)
const c = makeDomainFunction(z.object({ id: z.number() }))(async ({ id }) => Boolean(id))

const results = await all(a, b, c)({ id: 1 })
```

On the exemple above, the result will be of type `Result<[string, number, boolean]>`:
```ts
{
  success: true,
  data: ['1', 2, true],
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```

If one or more of the functions fails, the errors will be concatenated:

```ts
const a = makeDomainFunction(z.object({ id: z.number() }))(async () => {
  throw new Error('Error A')
})
const b = makeDomainFunction(z.object({ id: z.number() }))(async () => {
  throw new Error('Error B')
})

const results = await all(a, b)({ id: 1 })

/*{
  success: false,
  errors: [{ message: 'Error A' }, { message: 'Error B' }],
  inputErrors: [],
  environmentErrors: [],
}*/
```

### pipe

It creates a single domain function out of a composition of multiple domain functions.
It will pass the same environment to all given functions and pass the output of one to the next's input in left-to-right order.
The resulting data is going to be the output of the rightmost function.

Note that there is no type-level assurance (yet) that one function output will be succesfully parsed by the next function in the pipeline.
```ts
const a = makeDomainFunction(z.object({ aNumber: z.number() }))(
  async ({ aNumber }) => ({
    aString: String(aNumber),
  }),
)
const b = makeDomainFunction(z.object({ aString: z.string() }))(
  async ({ aString }) => ({
    aBoolean: aString == '1',
  }),
)
const c = makeDomainFunction(z.object({ aBoolean: z.boolean() }))(
  async ({ aBoolean }) => !aBoolean,
)

const d = pipe(a, b, c)

const result = await d({ aNumber: 1 })
```

On the exemple above, the result will be of type `Result<boolean>`:
```ts
{
  success: true,
  data: false,
  errors: [],
  inputErrors: [],
  environmentErrors: [],
}
```

If one functions fails, the execution will halt and the error returned.

### map

It creates a single domain function that will apply a transformation over the `result.data` of a successful `DomainFunction`.
When the given domain function fails, its error is returned wihout changes.
The resulting data is going to be the output of the second argument.

This could be useful when composing domain functions to align their types:

```ts
const fetchAsText = makeDomainFunction(z.object({ userId: z.number() }))(
  ({ userId }) =>
    fetch(`https://reqres.in/api/users/${String(userId)}`).then((r) =>
      r.json(),
    ),
)

const fullName = makeDomainFunction(
  z.object({ first_name: z.string(), last_name: z.string() }),
)(async ({ first_name, last_name }) => `${first_name} ${last_name}`)

const fetchFullName = pipe(
  map(fetchAsText, ({ data }) => data),
  fullName,
)

const result = fetchFullName({ userId: 2 })
```

On the exemple above, the result will be of type `Result<string>` and tis value something like:
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

It creates a single domain function that will apply a transformation over the `ErrorResult` of a failed `DomainFunction`.
When the given domain function suceeds, its result is returned wihout changes.

This could be useful when adding any layer of error handling.
In the example bellow we are discarding the contents of the errors but keeping a tally of how many there were:

```ts
const increment = makeDomainFunction(z.object({ id: z.number() }))(
  async ({ id }) => id + 1,
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

On the exemple above, the `result` will be:
```ts
{
  success: false,
  errors: [{ message: 'Number of errors: 0' }],
  inputErrors: [{ message: 'Number of input errors: 1' }],
  environmentErrors: [{ message: 'Number of environment errors: 0' }],
}
```

## Input Utilities
We export some functions to help you extract values out of your requests before sending them as user input.

### inputFromForm

Extracts values sent in a request through the `FormData` as an object of values:
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

export const action = async ({ request }) => {
  const values = await inputFromForm(request)
  // values = { email: 'john@doe.com', password: '1234' }
}
```

### inputFromFormData

Extracts a structured objecto from a `FormData`:
```tsx
const formData = new FormData()
formData.append('email', 'john@doe.com')
formData.append('tasks[]', 'one')
formData.append('tasks[]', 'two')
const values = inputFromFormData(formData)
// values = { email: 'john@doe.com', tasks: ['one', 'two'] }
```

### inputFromUrl
Extracts values sent in a request through the URL as an object of values:
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

export const action = async ({ request }) => {
  const values = inputFromUrl(request)
  // values = { page: '2' }
}
```
### inputFromSearch
Extracts a structured object from a `URLSearchParams` object:
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

export const action = async ({ request }) => {
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

## Error Utilities
To improve DX when dealing with errors we do export a couple of utilities.

### errorMessagesFor
Given a array of `SchemaError` be it from `inputErrors` or `environmentErrors` and a name, it returns a list of error messages with that name in their path.

```tsx
const result = {
  success: false,
  errors: [],
  inputErrors: [],
  environmentErrors: [{ message: 'Must not be empty', path: ['host'] }, { message: 'Must be a fully qualified domain', path: ['host'] }]
}

errorMessagesFor(result.inputErrors, 'email') === null
errorMessagesFor(result.environmentErrors, 'host').message === 'Must not be empty'
```
### errorMessagesForSchema
Given a array of `SchemaError` be it from `inputErrors` or `environmentErrors` and a Zod Schema, it returns an object with a list of error messages for each key in the schema shape.

```tsx
const schema = z.object({ email: z.string().nonEmpty(), password: z.string().nonEmpty() })
const result = {
  success: false,
  errors: [],
  inputErrors: [{ message: 'Must not be empty', path: ['email'] }, { message: 'Must be a string', path: ['email'] }, { message: 'Must not be empty', path: ['password'] }],
  environmentErrors: []
}

errorForSchema(result.inputErrors, schema)
/*
{
  email: ['Must not be empty', 'Must be a string'],
  password: ['Must not be empty']
}
*/
```

## Acknowlegements

We are grateful for [Zod](https://github.com/colinhacks/zod) as it is a great library and informed our design.
It's worth mentioning two other projects that inspired remix domains:

- [Servant](https://github.com/haskell-servant/servant/)
- [tRPC](https://trpc.io)
