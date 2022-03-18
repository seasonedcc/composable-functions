# Remix Domains

Remix Domains helps you to keep your Business Logic appart from your actions/loaders plumbing.
It does this by enforcing the parameters' types in runtime and always wrapping results (even exceptions) into a `Promise<Result<Output>>` type.
## Benefits
- Easier to test and maintain your business logic
- Express business logic in the type system
- Removes the plumbing of extracting and parsing structured data from your actions
- Write your business logic with the assurance that your values conform to your types

## Quickstart

```
npm i remix-domains zod
```

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
