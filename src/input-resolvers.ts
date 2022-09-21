import * as qsModule from 'https://deno.land/x/deno_qs@0.0.1/mod.ts'

// Little hack to ensure we are compatible with the default export of qs in NPM
const qs = qsModule.qs ? qsModule.qs : qsModule

const inputFromSearch = (queryString: URLSearchParams) =>
  (qs as typeof qsModule.qs).parse(queryString.toString())

const inputFromFormData = (formData: FormData) =>
  inputFromSearch(new URLSearchParams(formData as URLSearchParams))

const inputFromForm = async (request: {
  clone: () => { formData: () => Promise<FormData> }
}) => inputFromFormData(await request.clone().formData())

const inputFromUrl = (request: { url: string }) =>
  inputFromSearch(new URL(request.url).searchParams)

export { inputFromForm, inputFromUrl, inputFromFormData, inputFromSearch }
