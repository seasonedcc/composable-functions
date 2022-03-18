import qs from 'qs'
import { Request } from '@remix-run/node'

const inputFromForm = async (request: Request) =>
  qs.parse(await request.clone().text())

const inputFromUrl = (request: Request) =>
  qs.parse(new URL(request.url).searchParams.toString())

export { inputFromForm, inputFromUrl }
