import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { df } from 'composable-functions'
import { formatUser, getUser } from '~/business/users'
import { loaderResponseOrThrow } from '~/lib'

// The output of getUser will be the input of formatUser
const getData = df.pipe(getUser, formatUser)

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
        rel="noreferer"
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
