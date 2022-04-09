import * as z from 'zod'
import { makeDomainFunction } from 'remix-domains'
import { createCookie } from '@remix-run/node'

const cookie = createCookie('gpd', {
  maxAge: 60, // One minute, but should probably be longer
})

const getGPDInfo = makeDomainFunction(
  z.any(),
  z.object({ agreed: z.boolean().optional() }),
)(async (_input, { agreed }) => {
  return { agreed }
})

const agreeToGPD = makeDomainFunction(
  z.object({ agree: z.preprocess((v) => v === 'true', z.boolean()) }),
)(async ({ agree }) => ({ agreed: agree }))

export { cookie, agreeToGPD, getGPDInfo }
