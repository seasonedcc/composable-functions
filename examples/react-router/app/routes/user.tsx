import { Link } from 'react-router'
import { applySchema, pipe } from 'composable-functions'
import { formatUser, getUser } from '~/business/users'
import { z } from '@zod/mini'
import { Route } from '../routes/+types/user'

const getData = applySchema(
  // We are adding runtime validation to the React-Router's `Params` object
  z.object({ id: z.string() }),
)(
  // The output of getUser will be the input of formatUser
  // We could also be using `map` instead of `pipe` here
  pipe(getUser, formatUser),
)

export const loader = async ({ params }: Route.LoaderArgs) => {
  const result = await getData(params)
  if (!result.success) throw new Error('Could not load data')
  return result.data
}

export default function Index({ loaderData: { user } }: Route.ComponentProps) {
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
