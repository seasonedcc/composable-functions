# Handling external input
TODO

## Input Resolvers
TODO

## FAQ

- I want to use composable-functions in a project that does not have Zod, how can I use other schema validation libraries?
  - We [created an example](./examples/arktype/src/) in the example folder showing how to construct your own `withSchema` functions based on other parsers.


<!-- GPT -->

### Handling External Inputs

```markdown
# Handling External Inputs

When dealing with external data such as API requests or form submissions, it's crucial to ensure that the data is correctly validated and structured before processing it. Composable-functions provide utility functions and schema application techniques to handle these scenarios effectively.

## Applying Schemas

To ensure type safety at runtime, use the `applySchema` or `withSchema` functions to validate external inputs against defined schemas.

### Apply Schema

The `applySchema` function takes a composable and schemas for the input and environment, applying these schemas to ensure data integrity.

```typescript
import { composable, applySchema } from 'composable-functions'
import { z } from 'zod'

const fn = composable(({ greeting }: { greeting: string }, { user }: { user: { name: string } }) => ({
  message: `${greeting} ${user.name}`
}))

const safeFunction = applySchema(
  fn,
  z.object({ greeting: z.string() }),
  z.object({ user: z.object({ name: z.string() }) })
)

type Test = typeof safeFunction
//   ^? Composable<(input?: unknown, env?: unknown) => { message: string }>
```

### With Schema

The withSchema function is similar to applySchema but provides a more concise syntax for creating runtime-safe composables.

```ts
import { composable, withSchema } from 'composable-functions'
import { z } from 'zod'

const runtimeSafeAdd = withSchema(z.number(), z.number())((a, b) => a + b)
//    ^? Composable<(input?: unknown, env?: unknown) => number>
const result = await runtimeSafeAdd(1, 2)
/*
result = {
  success: true,
  data: 3,
  errors: []
}
*/
```

#### Input Resolvers

Composable-functions provide several utilities to help extract and structure values from external inputs, such as forms, URLs, and search parameters.

##### InputFromForm

inputFromForm reads a request’s FormData and extracts its values into a structured object.

```ts
import { inputFromForm } from 'composable-functions'

async function handleRequest(request: Request) {
  const values = await inputFromForm(request)
  // values = { email: 'john@doe.com', password: '1234' }
}
```

### InputFromFormData

inputFromFormData extracts values from a FormData object into a structured object.

```ts
import { inputFromFormData } from 'composable-functions'

const formData = new FormData()
formData.append('email', 'john@doe.com')
formData.append('tasks[]', 'one')
formData.append('tasks[]', 'two')
const values = inputFromFormData(formData)
// values = { email: 'john@doe.com', tasks: ['one', 'two'] }
```

### InputFromURL

inputFromUrl reads a request’s query parameters and extracts values into a structured object.

```ts
import { inputFromUrl } from 'composable-functions'

async function handleRequest(request: Request) {
  const values = inputFromUrl(request)
  // values = { page: '2' }
}
```

### Input From Search

inputFromSearch extracts values from a URLSearchParams object into a structured object.

```ts
import { inputFromSearch } from 'composable-functions'

const qs = new URLSearchParams()
qs.append('colors[]', 'red')
qs.append('colors[]', 'green')
qs.append('colors[]', 'blue')
const values = inputFromSearch(qs)
// values = { colors: ['red', 'green', 'blue'] }
```

These input resolvers make it easy to handle structured data from various sources, ensuring that your application can process external inputs safely and efficiently.
