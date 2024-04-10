import { Cookie, json, TypedResponse } from '@remix-run/node'
import { Result } from 'composable-functions'

/**
 * Given a Cookie and a Request it returns the stored cookie's value as an object
 */
function envFromCookie(
  cookie: Cookie,
): (request: Request) => Promise<Record<string, unknown>> {
  return async (request: Request) => {
    const cookieHeader = request.headers.get('Cookie')
    const parsedCookie = (await cookie.parse(cookieHeader)) || {}
    return parsedCookie
  }
}

const actionResponse = <T extends Result<X>, X>(
  result: T,
  opts?: RequestInit,
) => json(result, { status: result.success ? 200 : 422, ...opts })

const loaderResponseOrThrow = <T extends Result<unknown>>(
  result: T,
  opts?: RequestInit,
): T extends { data: infer X } ? TypedResponse<X> : never => {
  if (!result.success) {
    throw new Response(result.errors[0].message ?? 'Internal server error', {
      status: 500,
    })
  }

  return json(result.data, { status: 200, ...opts }) as never
}

export { envFromCookie, actionResponse, loaderResponseOrThrow }
