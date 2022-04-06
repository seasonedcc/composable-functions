# Remix Domains

Remix Domains helps you to keep your Business Logic appart from your actions/loaders plumbing.
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
  - [Type Utilities](#type-utilities)
    - [UnpackData](#unpackdata)
    - [UnpackSuccess](#unpacksuccess)
    - [UnpackResult](#unpackresult)
  - [Combining domain functions](#combining-domain-functions)
    - [all](#all)
    - [pipe](#pipe)
  - [Input Utilities](#input-utilities)
    - [inputFromForm](#inputfromform)
    - [inputFromUrl](#inputfromurl)
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
}
*/
const failedResult = await increment({ number: 'foo' })
/*
failedResult = {
  success: false,
  inputErrors: [{ path: ['number'], message: 'Expected number, received nan' }],
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
  errors: z.ZodIssue[] | { message: string }
  inputErrors: z.ZodIssue[]
}
```

Where `inputErrors` will be the errors from parsing the user input and `errors` will be either from parsing the environment or any exceptions thrown inside the domain function:

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
}
*/
```

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
// Success = { success: true, data: string, errors: [], inputErrors: [] }
// Which is the same as: SuccessResult<string>
```
### UnpackResult
It infers the result of a domain function:
```ts
const fn = makeDomainFunction()(async () => '')

type Result = UnpackResult<typeof fn>
/*
Result =
  | { success: true, data: string, errors: [], inputErrors: [] }
  | { success: false, errors: z.ZodIssue[], inputErrors: z.ZodIssue[] }

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
  inputErrors: []
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
  inputErrors: []
}
```

If one functions fails, the execution will halt and the error returned.

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

Both of these functions will parse the input using [`qs`](https://www.npmjs.com/package/qs):
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

## Acknowlegements

We are grateful for [Zod](https://github.com/colinhacks/zod) as it is a great library and informed our design.
It's worth mentioning two other projects that inspired remix domains:

- [Servant](https://github.com/haskell-servant/servant/)
- [tRPC](https://trpc.io)
