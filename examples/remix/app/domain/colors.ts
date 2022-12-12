import * as z from 'zod'
import { makeDomainFunction } from 'domain-functions'
import { createApi } from '~/lib'

const fetchApi = createApi('https://reqres.in/api')

type Color = {
  id: number
  name: string
  year: number
  color: string
  pantone_value: string
}
const listColors = makeDomainFunction(
  z.any(),
  // The "environment" knows the URL's queryString
  z.object({ page: z.string().optional() }),
)(async (_i, { page = '1' }) => ({
  colors: await fetchApi<{ data: Color[] }>(`/colors?page=${page}`),
}))

const getColor = makeDomainFunction(z.object({ id: z.string() }))(
  async ({ id }) => {
    const color = await fetchApi<{ data: Color }>(`/colors/${id}`)
    return {
      colorData: color.data,
    }
  },
)

const mutateColor = makeDomainFunction(
  z.object({
    id: z.string(),
    color: z.string().min(1, 'Color is required'),
  }),
)(async ({ id, color }) =>
  fetchApi<Color>('/colors/' + id, {
    method: 'POST',
    body: { color },
  }),
)

export { listColors, getColor, mutateColor }
