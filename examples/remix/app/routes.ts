import { flatRoutes } from '@remix-run/fs-routes'
import type { RouteConfig } from '@remix-run/route-config'

export default [
  ...(await flatRoutes()),
] satisfies RouteConfig
