import { ActionFunction, json, LoaderFunction } from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { inputFromForm, UnpackData, UnpackResult } from 'remix-domains'
import tinycolor from 'tinycolor2'
import { getColor, mutateColor } from '~/domain/colors.server'

type LoaderData = UnpackData<typeof getColor>
export const loader: LoaderFunction = async ({ params }) => {
  const result = await getColor(params)
  if (!result.success) throw new Response('Not found', { status: 404 })

  return json<LoaderData>(result.data)
}

type ActionData = UnpackResult<typeof mutateColor>
export const action: ActionFunction = async ({ request }) => {
  const result = await mutateColor(await inputFromForm(request))
  return json<ActionData>(result, { status: result.success ? 200 : 422 })
}

export default function Index() {
  const { data } = useLoaderData<LoaderData>()
  const actionData = useActionData<ActionData>()
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
          {actionData && actionData.inputErrors.length > 0 && (
            <small className="block text-sm text-red-500">
              {actionData.inputErrors[0].message}
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
