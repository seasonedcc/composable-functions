import type {
  DataFunctionArgs,
  LinksFunction,
  MetaFunction,
} from '@remix-run/node'
import { json } from '@remix-run/node'
import {
  Form,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  useActionData,
  useLoaderData,
  useRouteError,
} from '@remix-run/react'
import { ScrollRestoration } from '@remix-run/react'
import * as React from 'react'

import { envFromCookie, loaderResponseOrThrow } from '~/lib'
import { agreeToGPD, cookie, getGPDInfo } from '~/domain/gpd'
import { inputFromForm } from 'domain-functions'

import styles from './tailwind.css'

export const meta: MetaFunction = () => [
  {
    charset: 'utf-8',
    title: 'Remix Domains',
    viewport: 'width=device-width,initial-scale=1',
    language: 'en-US',
  },
]

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

export const loader = async ({ request }: DataFunctionArgs) => {
  const result = await getGPDInfo(null, await envFromCookie(cookie)(request))
  return loaderResponseOrThrow(result)
}

export const action = async ({ request }: DataFunctionArgs) => {
  const result = await agreeToGPD(await inputFromForm(request))
  if (!result.success || result.data.agreed === false) {
    return json(result)
  }
  return json(result, {
    headers: { 'Set-Cookie': await cookie.serialize(result.data) },
  })
}

export default function App() {
  const { agreed } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const disagreed = actionData?.success && actionData.data.agreed === false
  return (
    <Document>
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
      <Scripts />
    </Document>
  )
}

type DocumentProps = {
  children: React.ReactNode
  title?: string
}
function Document({ children, title }: DocumentProps) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {title && <title>{title}</title>}
        <Meta />
        <Links />
      </head>
      <body className="isolate flex min-h-screen w-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-[#282c34] p-12 text-center text-white antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  console.error(error)
  return (
    <Document title="Oh no!">
      <div>
        <h1 className="text-6xl font-bold">500</h1>
        <h3 className="mt-2 text-xl">Server error</h3>
      </div>
    </Document>
  )
}
