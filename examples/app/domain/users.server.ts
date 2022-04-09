import * as z from 'zod'
import { makeDomainFunction } from 'remix-domains'

const userSchema = z.object({
  id: z.number(),
  address: z.object({}),
  company: z.object({}),
  email: z.string(),
  name: z.string(),
  phone: z.string(),
  username: z.string(),
  website: z.string(),
})
type User = z.infer<typeof userSchema>
type Options = Omit<RequestInit, 'body'> & { body?: any }
function fetchApi(path: string, options?: Options) {
  return fetch('https://jsonplaceholder.typicode.com' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
}

const listUsers = makeDomainFunction(z.any())(async () => {
  const result = await fetchApi('/users')
  if (!result.ok) throw new Error('Service unavailable')

  const data = (await result.json()) as User[]
  return data
})

const getUser = makeDomainFunction(z.object({ id: z.string() }))(
  async ({ id }) => {
    const result = await fetchApi('/users/' + id)
    if (!result.ok) throw new Error('Not found')

    const data = (await result.json()) as User
    return data
  },
)

const formatUser = makeDomainFunction(userSchema)(async (user) => {
  return {
    ...user,
    link: 'https://' + user.website,
    initials: user.name
      .split(' ')
      .map((name) => name[0])
      .join('')
      .toUpperCase(),
  }
})

export { listUsers, getUser, formatUser }
