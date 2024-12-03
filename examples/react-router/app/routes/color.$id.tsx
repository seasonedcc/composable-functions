import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Form, Link, useActionData, useLoaderData } from 'react-router';
import { applySchema, inputFromForm } from 'composable-functions'
import tinycolor from 'tinycolor2'
import { getColor, mutateColor } from '~/business/colors'
import { actionResponse, loaderResponseOrThrow } from '~/lib'
import { z } from 'zod'

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const result = await applySchema(z.object({ id: z.string() }))(getColor)(
    params,
  )
  return loaderResponseOrThrow(result)
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const input = await inputFromForm(request)
  const result = await mutateColor(input)
  return actionResponse(result)
}

export default function Index() {
  const { data } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const color = actionData?.success ? actionData.data.color : data.color
  return (
    <>
      <h1
        style={{
          color,
        }}
        className="text-6xl font-extrabold"
      >
        {data.name}
      </h1>
      <div className="mt-6 text-xl">
        <Form method="post" className="mt-6 text-3xl">
          <input type="hidden" name="id" value={data.id} />
          <button
            name="color"
            value={tinycolor(color).lighten().toHexString()}
            type="submit"
            className="text-cyan-500 hover:underline"
          >
            Lighten
          </button>{' '}
          |{' '}
          <button
            name="color"
            value={tinycolor(color).darken().toHexString()}
            type="submit"
            className="text-cyan-500 hover:underline"
          >
            Darken
          </button>{' '}
          |{' '}
          <button
            name="color"
            type="submit"
            className="text-orange-400 hover:underline"
          >
            Error
          </button>
          {actionData && actionData.errors.length > 0 && (
            <small className="block text-sm text-red-500">
              {actionData.errors[0].message}
            </small>
          )}
        </Form>
        <Link
          className="mt-4 inline-flex text-cyan-500 hover:underline"
          to=".."
        >
          Back
        </Link>
      </div>
    </>
  )
}
