import * as z from 'zod'
import { makeDomainFunction } from 'remix-domains'
import { createApi } from '.'

function fetchApi<T>(...args: Parameters<ReturnType<typeof createApi>>) {
  return createApi<T>('https://reqres.in/api')(...args)
}

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

const listColors = makeDomainFunction(
  z.any(),
  z.object({ page: z.string().optional() }),
)((_i, { page }) =>
  fetchApi<ApiData<Color[]>>(page ? `/colors?page=${page}` : '/colors'),
)

const getColor = makeDomainFunction(z.object({ id: z.string() }))(({ id }) =>
  fetchApi<ApiData<Color>>('/colors/' + id),
)

const mutateColor = makeDomainFunction(
  z.object({
    id: z.string(),
    color: z.string().nonempty('Color is required'),
  }),
)(({ id, color }) =>
  fetchApi<Color>('/colors/' + id, {
    method: 'POST',
    body: { color },
  }),
)

export { listColors, getColor, mutateColor }
