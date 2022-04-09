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
const listColors = makeDomainFunction(
  z.any(),
  z.object({ page: z.string().optional() }),
)((_i, { page = '1' }) => fetchApi<{ data: Color[] }>(`/colors?page=${page}`))

const getColor = makeDomainFunction(z.object({ id: z.string() }))(({ id }) =>
  fetchApi<{ data: Color }>(`/colors/${id}`),
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
