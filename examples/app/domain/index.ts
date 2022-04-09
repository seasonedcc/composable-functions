import { Cookie } from '@remix-run/node'

type Options = Omit<RequestInit, 'body'> & { body?: any }
function createApi(basePath: string) {
  return async <T = any>(path: string, options?: Options): Promise<T> =>
    fetch(basePath + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    }).then((res) => res.json())
}

function envFromCookie(cookie: Cookie) {
  return async (request: Request) => {
    const cookieHeader = request.headers.get('Cookie')
    const parsedCookie = (await cookie.parse(cookieHeader)) || {}
    return parsedCookie as Record<string, unknown>
  }
}

export { createApi, envFromCookie }
