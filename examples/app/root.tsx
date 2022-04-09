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
      <ScrollRestoration />
      <Scripts />
      <LiveReload />
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
        <Meta />
        {title && <title>{title}</title>}
        <Links />
      </head>
      <body className="isolate flex min-h-screen w-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-[#282c34] p-12 text-center text-white antialiased">
        {children}
      </body>
    </html>
  )
}

export const CatchBoundary = () => {
  const caught = useCatch()
  return (
    <Document title={`Error ${caught.status}`}>
      <h1>{caught.status}</h1>
      <h3>{caught.statusText}</h3>
    </Document>
  )
}

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  console.error(error)
  return (
    <Document title="Oh no!">
      <h1>500</h1>
      <h3>Server error</h3>
    </Document>
  )
}
