import * as z from 'zod'
import { composable } from 'composable-functions'
import { makeService } from 'make-service'

const jsonPlaceholder = makeService('https://jsonplaceholder.typicode.com')

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

const listUsers = composable(async () => {
  const response = await jsonPlaceholder.get('/users')
  return response.json(z.array(userSchema))
})

const getUser = composable(async ({ id }: { id: string }) => {
  const response = await jsonPlaceholder.get('/users/:id', { params: { id } })
  return response.json(userSchema)
})

const formatUser = composable((user: z.output<typeof userSchema>) => {
  return {
    user: {
      ...user,
      link: 'https://' + user.website,
      initials: user.name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase(),
    },
  }
})

export { listUsers, getUser, formatUser }
