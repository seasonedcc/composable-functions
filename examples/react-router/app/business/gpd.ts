import { z } from '@zod/mini'
import { applySchema } from 'composable-functions'
import { createCookie } from 'react-router';

const cookie = createCookie('gpd', {
  maxAge: 20, // seconds
})

const getGPDInfo = applySchema(
  z.any(),
  // The "context" knows there can be cookie information in the Request
  z.interface({ 'agreed?': z.boolean() }),
)(async (_input, { agreed }) => {
  return { agreed }
})

const agreeToGPD = applySchema(
  // Agreeing to the GPD is user input
  z.object({ agree: z.stringbool() }),
)(async ({ agree }) => ({ agreed: agree }))

export { cookie, agreeToGPD, getGPDInfo }
