import * as qsModule from 'https://deno.land/x/deno_qs@0.0.1/mod.ts'

type ParsedQs = {
  [key: string]: undefined | string | string[] | ParsedQs | ParsedQs[]
}

type FormDataLike = Iterable<readonly [PropertyKey, unknown]>
type RequestLike = {
  url: string
  clone: () => { formData: () => Promise<FormDataLike> }
}

// Little hack to ensure we are compatible with the default export of qs in NPM
const qs = qsModule.qs ? qsModule.qs : qsModule

const inputFromSearch = (queryString: URLSearchParams) =>
  (qs as typeof qsModule.qs).parse(queryString.toString()) as ParsedQs

const inputFromFormData = (formData: FormDataLike) =>
  inputFromSearch(new URLSearchParams(formData as URLSearchParams))

const inputFromForm = async (request: RequestLike) =>
  inputFromFormData(await request.clone().formData())

const inputFromUrl = (request: RequestLike) =>
  inputFromSearch(new URL(request.url).searchParams)

export { inputFromForm, inputFromUrl, inputFromFormData, inputFromSearch }
