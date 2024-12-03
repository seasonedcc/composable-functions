import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('./routes/home.tsx'),
  route('color/:id', './routes/color.tsx'),
  route('user/:id', './routes/user.tsx'),
] satisfies RouteConfig
