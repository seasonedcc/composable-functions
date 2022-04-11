import { json, LoaderFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { pipe, UnpackData } from 'remix-domains'
import { formatUser, getUser } from '~/domain/users'
import { notFound } from '~/lib'

// The output of getUser will be the input of formatUser
const getData = pipe(getUser, formatUser)

type LoaderData = UnpackData<typeof getData>
export const loader: LoaderFunction = async ({ params }) => {
  const result = await getData(params)
  if (!result.success) throw notFound()

  return json<LoaderData>(result.data)
}

export default function Index() {
  const user = useLoaderData<LoaderData>()
  return (
    <>
      <a
        href={user.link}
        className="hover:text-cyan-500"
        target="_blank"
        rel="noreferer noopener"
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
