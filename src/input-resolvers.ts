import { qs } from 'https://deno.land/x/deno_qs/mod.ts'

const inputFromSearch = (queryString: URLSearchParams) =>
  qs.parse(queryString.toString())

const inputFromFormData = (formData: FormData) =>
  inputFromSearch(new URLSearchParams(formData as URLSearchParams))

const inputFromForm = async (request: Request) =>
  inputFromFormData(await request.clone().formData())

const inputFromUrl = (request: Request) =>
  inputFromSearch(new URL(request.url).searchParams)

export { inputFromForm, inputFromUrl, inputFromFormData, inputFromSearch }
