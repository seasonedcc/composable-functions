import { Cookie } from '@remix-run/node'

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

const notFound = (body?: BodyInit) =>
  new Response(body ?? 'Not found', {
    status: 404,
  })

const internalError = (body?: BodyInit) =>
  new Response(body ?? 'Internal server error', {
    status: 500,
  })

const badParameters = (body?: BodyInit) =>
  new Response(body ?? 'Bad parameters', {
    status: 422,
  })

const serviceUnavailable = (body?: BodyInit) =>
  new Response(body ?? 'Service unavailable', {
    status: 503,
  })

export {
  createApi,
  envFromCookie,
  notFound,
  internalError,
  badParameters,
  serviceUnavailable,
}
