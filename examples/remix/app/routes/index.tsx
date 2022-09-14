import { json, LoaderFunction } from '@remix-run/node'
import { Link, useLoaderData, useLocation } from '@remix-run/react'
import { inputFromUrl, map, all, UnpackData } from 'remix-domains'
import { listColors } from '~/domain/colors'
import { listUsers } from '~/domain/users'
import { serviceUnavailable } from '~/lib'

// We'll run these 2 domain functions in parallel with Promise.all
const getData = all(
  // The second argument will transform the successful result of listColors,
  // we only care about what is in the "data" field
  map(listColors, ({ data }) => data),
  listUsers,
)
type LoaderData = UnpackData<typeof getData>
export const loader: LoaderFunction = async ({ request }) => {
  // inputFromUrl gets the queryString out of the request and turns it into an object
  const result = await getData(null, inputFromUrl(request))
  if (!result.success) throw serviceUnavailable()

  return json<LoaderData>(result.data)
}

export default function Index() {
  const [colors, users] = useLoaderData<LoaderData>()
  const location = useLocation()
  const qs = new URLSearchParams(location.search)
  return (
    <>
      <h1 className="text-6xl font-extrabold">Remix Domains</h1>
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
