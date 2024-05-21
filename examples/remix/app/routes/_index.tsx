import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData, useLocation } from '@remix-run/react'
import { inputFromUrl, collect, map, applySchema } from 'composable-functions'
import { listColors } from '~/business/colors'
import { listUsers } from '~/business/users'
import { loaderResponseOrThrow } from '~/lib'
import { z } from 'zod'

const getData = applySchema(
  // We'll run these 2 composables in parallel with Promise.all
  collect({
    // The second argument will transform the successful result of listColors,
    // we only care about what is in the "data" field
    colors: map(listColors, ({ data }) => data),
    users: listUsers,
  }),
  // We are applying a schema for runtime safety
  // By not defining schemas for every composable we avoid unnecessary processing
  z.object({ page: z.string().optional() }),
)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // inputFromUrl gets the queryString out of the request and turns it into an object
  const result = await getData(inputFromUrl(request))
  return loaderResponseOrThrow(result)
}

export default function Index() {
  const { users, colors } = useLoaderData<typeof loader>()
  const location = useLocation()
  const qs = new URLSearchParams(location.search)
  return (
    <>
      <h1 className="text-6xl font-extrabold">Composables</h1>
      <ul className="flex flex-col gap-8 py-10">
        {colors.map(({ id, name, color }) => (
          <li key={id}>
            <p style={{ color }} className="text-4xl font-bold">
              <Link className="underline" to={`color/${id}`}>
                {name}
              </Link>
            </p>
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-2 py-10 text-left">
        {users.map(({ id, name, email }) => (
          <li key={`user-${id}`}>
            <Link
              className="hover:text-cyan-500 hover:underline"
              to={`user/${id}`}
            >
              <strong>{name}</strong> - {email}
            </Link>
          </li>
        ))}
      </ul>
      {qs.get('page') === '2' ? (
        <Link className="text-cyan-500 hover:underline" to=".">
          Prev Page
        </Link>
      ) : (
        <Link className="text-cyan-500 hover:underline" to="?page=2">
          Next Page
        </Link>
      )}
    </>
  )
}
