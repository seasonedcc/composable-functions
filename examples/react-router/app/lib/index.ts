import type { Cookie, TypedResponse } from 'react-router';
import { data } from 'react-router';
import type { Result } from 'composable-functions'
import { catchFailure, serialize, fromSuccess } from 'composable-functions'

/**
 * Given a Cookie and a Request it returns the stored cookie's value as an object, in case of failure it returns an empty object.
 */
const safeReadCookie = catchFailure(
  async (request: Request, cookie: Cookie) => {
    const cookieHeader = request.headers.get('Cookie')
    const cookieObj = (await cookie.parse(cookieHeader)) as Record<
      string,
      unknown
    >
    if (!cookieObj) throw new Error('Cookie not found')

    return cookieObj
  },
  () => ({}),
)

const ctxFromCookie = fromSuccess(safeReadCookie)

const actionResponse = <X>(result: Result<X>, opts?: RequestInit): Result<X>  =>
  data(serialize(result), { status: result.success ? 200 : 422, ...opts }) as unknown as Result<X>

const loaderResponseOrThrow = <T extends Result<unknown>>(
  result: T,
  opts?: RequestInit,
): T extends { data: infer X } ? TypedResponse<X> : never => {
  if (!result.success) {
    throw new Response(result.errors[0].message ?? 'Internal server error', {
      status: 500,
    })
  }

  return data(result.data, { status: 200, ...opts }) as never
}

export { ctxFromCookie, actionResponse, loaderResponseOrThrow }
