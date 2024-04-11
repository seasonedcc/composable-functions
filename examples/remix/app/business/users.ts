import * as z from 'zod'
import { df } from 'composable-functions'
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

const listUsers = df.make(z.any())(async () => {
  const response = await jsonPlaceholder.get('/users')
  return response.json(z.array(userSchema))
})

const getUser = df.make(z.object({ id: z.string() }))(async ({ id }) => {
  const response = await jsonPlaceholder.get('/users/:id', { params: { id } })
  return response.json(userSchema)
})

const formatUser = df.make(userSchema)((user) => {
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
