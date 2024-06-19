import type { Cookie, TypedResponse } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
  catchFailure,
  Result,
  SerializableResult,
  composable,
  serialize,
  fromSuccess,
} from 'composable-functions'

/**
 * Given a Cookie and a Request it returns the stored cookie's value as an object
 */
const strictReadCookie = composable(
  async (request: Request, cookie: Cookie) => {
    const cookieHeader = request.headers.get('Cookie')
    const cookieObj = (await cookie.parse(cookieHeader)) as Record<
      string,
      unknown
    >
    if (!cookieObj) throw new Error('Cookie not found')

    return cookieObj
  },
)
const safeReadCookie = catchFailure(strictReadCookie, () => ({}))

const ctxFromCookie = fromSuccess(safeReadCookie)

const actionResponse = <X>(
  result: Result<X>,
  opts?: RequestInit,
): TypedResponse<SerializableResult<X>> =>
  json(serialize(result), { status: result.success ? 200 : 422, ...opts })

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

export { ctxFromCookie, actionResponse, loaderResponseOrThrow }
