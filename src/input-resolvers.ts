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

/**
 * Parses the given URLSearchParams into an object.
 * @param queryString the URLSearchParams to parse
 * @returns the parsed object
 * @example
 * const parsed = inputFromSearch(new URLSearchParams('a=1&b=2'))
 * //    ^? { a: '1', b: '2' }
 */
const inputFromSearch = (queryString: URLSearchParams) =>
  (qs as typeof qsModule.qs).parse(queryString.toString()) as ParsedQs

/**
 * Parses the given FormData into an object.
 * @param formData the FormData to parse
 * @returns the parsed object
 * @example
 * const formData = new FormData()
 * formData.append('a', '1')
 * formData.append('b', '2')
 * const parsed = inputFromFormData(formData)
 * //    ^? { a: '1', b: '2' }
 */
const inputFromFormData = (formData: FormDataLike) =>
  inputFromSearch(new URLSearchParams(formData as URLSearchParams))

/**
 * Parses the given Request's formData into an object.
 * @param request the Request to parse
 * @returns the parsed object
 * @example
 * const formData = new FormData()
 * formData.append('a', '1')
 * formData.append('b', '2')
 * const request = new Request('https://example.com', {
 *  method: 'POST',
 *  body: formData,
 * })
 * const parsed = await inputFromForm(request)
 * //    ^? { a: '1', b: '2' }
 */
const inputFromForm = async (request: RequestLike) =>
  inputFromFormData(await request.clone().formData())

/**
 * Parses the given Request URL's queryString into an object.
 * @param request the Request to parse
 * @returns the parsed object
 * @example
 * const request = new Request('https://example.com?a=1&b=2')
 * const parsed = inputFromUrl(request)
 * //    ^? { a: '1', b: '2' }
 */
const inputFromUrl = (request: RequestLike) =>
  inputFromSearch(new URL(request.url).searchParams)

export { inputFromForm, inputFromUrl, inputFromFormData, inputFromSearch }
