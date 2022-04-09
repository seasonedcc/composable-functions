import * as z from 'zod'
import { makeDomainFunction } from 'remix-domains'

type Color = {
  id: number
  name: string
  year: number
  color: string
  pantone_value: string
}
type ApiData<T> = {
  page: number
  per_page: number
  total: number
  total_pages: number
  data: T
  support: {
    url: string
    text: string
  }
}
type Options = Omit<RequestInit, 'body'> & { body?: any }
function fetchApi(path: string, options?: Options) {
  return fetch('https://reqres.in/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
}

const listColors = makeDomainFunction(
  z.any(),
  z.object({ page: z.string().optional() }),
)(async (_i, { page }) => {
  const result = await fetchApi(page ? `/colors?page=${page}` : '/colors')
  if (!result.ok) throw new Error('Service unavailable')

  const data = (await result.json()) as ApiData<Color[]>
  return data
})

const getColor = makeDomainFunction(z.object({ id: z.string() }))(
  async ({ id }) => {
    const result = await fetchApi('/colors/' + id)
    if (!result.ok) throw new Error('Not found')

    const data = (await result.json()) as ApiData<Color>
    return data
  },
)

const mutateColor = makeDomainFunction(
  z.object({
    id: z.string(),
    color: z.string().nonempty('Color is required'),
  }),
)(async ({ id, color }) => {
  const result = await fetchApi('/colors/' + id, {
    method: 'POST',
    body: { color },
  })
  if (!result.ok) throw new Error('Service unavailable')
  const data = (await result.json()) as Color
  return data
})

export { listColors, getColor, mutateColor }
