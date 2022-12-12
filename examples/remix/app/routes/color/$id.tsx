import { ActionArgs, LoaderArgs } from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { inputFromForm } from 'domain-functions'
import tinycolor from 'tinycolor2'
import { getColor, mutateColor } from '~/domain/colors'
import { actionResponse, loaderResponseOrThrow } from '~/lib'

export const loader = async ({ params }: LoaderArgs) => {
  const result = await getColor(params)
  return loaderResponseOrThrow(result)
}

export const action = async ({ request }: ActionArgs) => {
  const result = await mutateColor(await inputFromForm(request))
  return actionResponse(result)
}

export default function Index() {
  const { colorData } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const color = actionData?.success ? actionData.data.color : colorData.color
  return (
    <>
      <h1
        style={{
          color,
        }}
        className="text-6xl font-extrabold"
      >
        {colorData.name}
      </h1>
      <div className="mt-6 text-xl">
        <Form method="post" className="mt-6 text-3xl">
          <input type="hidden" name="id" value={colorData.id} />
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
