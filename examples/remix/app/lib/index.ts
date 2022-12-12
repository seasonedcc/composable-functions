import { Cookie, json, TypedResponse } from '@remix-run/node'
import { Result } from 'domain-functions'

/**
 * A little helper to fetch an external API. It'll stringify any given body and append the given path to the basePath.
 */
type Options = Omit<RequestInit, 'body'> & { body?: any }
function createApi(basePath: string) {
  return async <T = any>(path: string, options?: Options): Promise<T> =>
    fetch(basePath + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    }).then((res) => res.json())
}

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

const internalError = (body?: BodyInit) =>
  new Response(body ?? 'Internal server error', {
    status: 500,
  })

const actionResponse = <T extends Result<X>, X>(
  result: T,
  opts?: RequestInit,
) => json(result, { status: result.success ? 200 : 422, ...opts })

const loaderResponseOrThrow = <T extends Result<unknown>>(
  result: T,
  opts?: RequestInit,
): T extends { data: infer X } ? TypedResponse<X> : never => {
  if (!result.success) {
    throw internalError(result.errors[0]?.message)
  }

  return json(result.data, { status: 200, ...opts }) as any
}

export {
  createApi,
  envFromCookie,
  internalError,
  actionResponse,
  loaderResponseOrThrow,
}
