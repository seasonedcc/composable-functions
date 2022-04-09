import {
  ErrorBoundaryComponent,
  LinksFunction,
  MetaFunction,
} from '@remix-run/node'
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
} from '@remix-run/react'
import * as React from 'react'

import styles from '~/styles/tailwind.css'

export const meta: MetaFunction = () => ({
  charset: 'utf-8',
  title: 'Remix Domains',
  viewport: 'width=device-width,initial-scale=1',
  language: 'en-US',
})

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

export default function App() {
  return (
    <Document>
      <main className="isolate flex w-full grow flex-col items-center justify-center">
        <Outlet />
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
        <LiveReload />
      </body>
    </html>
  )
}

export const CatchBoundary = () => {
  const caught = useCatch()
  return (
    <Document title={`Error ${caught.status}`}>
      <div>
        <h1 className="text-6xl font-bold">{caught.status}</h1>
        <h3 className="mt-2 text-xl">{caught.statusText}</h3>
      </div>
    </Document>
  )
}

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
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
