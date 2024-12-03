import {
  Form,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router'

import styles from './tailwind.css?url'

import { actionResponse, ctxFromCookie } from '~/lib'
import { agreeToGPD, cookie, getGPDInfo } from '~/business/gpd'
import { inputFromForm } from 'composable-functions'
import { Route } from './+types/root'

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: styles },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="isolate flex min-h-screen w-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-[#282c34] p-12 text-center text-white antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const result = await getGPDInfo(null, await ctxFromCookie(request, cookie))
  if (!result.success) throw new Error('Internal server error')
  return result.data
}

export const action = async ({ request }: Route.ActionArgs) => {
  const result = await agreeToGPD(await inputFromForm(request))
  if (!result.success || result.data.agreed === false) {
    return actionResponse(result)
  }
  return actionResponse(result, {
    headers: { 'Set-Cookie': await cookie.serialize(result.data) },
  })
}

export default function App({ loaderData, actionData }: Route.ComponentProps) {
  const { agreed } = loaderData
  const disagreed = actionData?.success && actionData.data.agreed === false
  return (
    <main className="isolate flex w-full grow flex-col items-center justify-center">
      <Outlet />
      {disagreed && (
        <p className="fixed bottom-0 max-w-full bg-[#282c34] px-6 py-4 text-2xl text-pink-500 md:bottom-2">
          You are not good for our marketing stuff 😩
        </p>
      )}
      {disagreed || agreed || (
        <Form
          method="post"
          className="fixed bottom-0 flex w-full max-w-full items-center gap-2 bg-amber-200 px-6 py-4 text-gray-900 shadow-md md:bottom-2 md:w-auto md:rounded"
        >
          Want some 🍪 ?
          <button
            name="agree"
            value="true"
            className="rounded border border-current p-2 hover:bg-gray-900/10"
            type="submit"
          >
            Agree... I guess
          </button>
          <button
            name="agree"
            value="false"
            className="rounded border border-current p-2 hover:bg-gray-900/10"
            type="submit"
          >
            No way!
          </button>
        </Form>
      )}
    </main>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  console.error(error)
  return (
    <div>
      <h1 className="text-6xl font-bold">500</h1>
      <h3 className="mt-2 text-xl">Server error</h3>
    </div>
  )
}
