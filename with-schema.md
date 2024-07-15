# Handling External Input

When dealing with external data such as API requests or form submissions, it's crucial to ensure that the data is correctly validated and structured before processing it. Composable functions provide utility functions and schema application techniques to handle these scenarios effectively.

## Using Schemas

To ensure type safety at runtime, use the `applySchema` function to validate external inputs against defined schemas.

**Note about schema validation libraries:** Composable functions use Zod for schema validation by default. If you prefer to use another library, you can create your own `applySchema` function based on the library of your choice. For an example, see the [Arktype example](./examples/arktype/README.md).

### applySchema

The `applySchema` function takes a schemas for the input and context, and a function, applying these schemas to ensure data integrity.

```typescript
import { composable, applySchema } from 'composable-functions'
import { z } from 'zod'

const fn = ({ greeting }: { greeting: string }, { user }: { user: { name: string } }) => ({
  message: `${greeting} ${user.name}`
})

const safeFunction = applySchema(
  z.object({ greeting: z.string() }),
  z.object({ user: z.object({ name: z.string() }) })
)
const fnWithSchema = safeFunction(fn)

type Test = typeof fnWithSchema
//   ^? ComposableWithSchema<{ message: string }>
```

## Input Resolvers

Composable functions provide several utilities to help extract and structure values from external inputs, such as requests, formData, and search parameters.

For more details on how to structure your data, refer to this [test file](./src/tests/input-resolvers.test.ts).

### inputFromForm

`inputFromForm` reads a request’s FormData and extracts its values into a structured object.

```ts
import { inputFromForm } from 'composable-functions'

async function handleRequest(request: Request) {
  const values = await inputFromForm(request)
  // values = { email: 'john@doe.com', password: '1234' }
}
```

### inputFromFormData

`inputFromFormData` extracts values from a FormData object into a structured object.

```ts
import { inputFromFormData } from 'composable-functions'

const formData = new FormData()
formData.append('email', 'john@doe.com')
formData.append('tasks[]', 'one')
formData.append('tasks[]', 'two')
const values = inputFromFormData(formData)
// values = { email: 'john@doe.com', tasks: ['one', 'two'] }
```

### inputFromUrl

`inputFromUrl` reads a request’s query parameters and extracts values into a structured object.

```ts
import { inputFromUrl } from 'composable-functions'

async function handleRequest(request: Request) {
  const values = inputFromUrl(request)
  // values = { page: '2' }
}
```

### inputFromSearch

`inputFromSearch` extracts values from a URLSearchParams object into a structured object.

```ts
import { inputFromSearch } from 'composable-functions'

const qs = new URLSearchParams()
qs.append('colors[]', 'red')
qs.append('colors[]', 'green')
qs.append('colors[]', 'blue')
const values = inputFromSearch(qs)
// values = { colors: ['red', 'green', 'blue'] }
```

## FAQ

- I want to use composable-functions in a project that does not have Zod, how can I use other schema validation libraries?
  - We [created an example](./examples/arktype/src/) in the example folder showing how to construct your own `applySchema` functions based on other parsers.
