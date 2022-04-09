import * as z from 'zod'
import { makeDomainFunction } from 'remix-domains'
import { createApi } from '.'

const fetchApi = createApi('https://jsonplaceholder.typicode.com')

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

const listUsers = makeDomainFunction(z.any())(() => fetchApi<User[]>('/users'))

const getUser = makeDomainFunction(z.object({ id: z.string() }))(({ id }) =>
  fetchApi<User>('/users/' + id),
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
