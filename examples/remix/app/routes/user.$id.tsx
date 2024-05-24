import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { applySchema, pipe } from 'composable-functions'
import { formatUser, getUser } from '~/business/users'
import { loaderResponseOrThrow } from '~/lib'
import { z } from 'zod'

const getData = applySchema(
  // We are adding runtime validation because the Remix's `Params` object is not strongly typed
  z.object({ id: z.string() }),
)(
  // The output of getUser will be the input of formatUser
  // We could also be using `map` instead of `pipe` here
  pipe(getUser, formatUser),
)

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const result = await getData(params)
  return loaderResponseOrThrow(result)
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>()
  return (
    <>
      <a
        href={user.link}
        className="hover:text-cyan-500"
        target="_blank"
        rel="noreferer noreferrer"
      >
        <h1 className="text-7xl font-extrabold">{user.initials}</h1>
        <h2>{user.name}</h2>
      </a>
      <Link className="mt-4 inline-flex text-cyan-500 hover:underline" to="..">
        Back
      </Link>
    </>
  )
}
