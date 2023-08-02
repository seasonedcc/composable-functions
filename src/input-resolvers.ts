type QueryStringRecord = {
  [key: string]:
    | undefined
    | string
    | string[]
    | QueryStringRecord
    | QueryStringRecord[]
}
type QueryStringPairs = [string, string][]

type FormDataLike = Iterable<readonly [PropertyKey, unknown]>
type RequestLike = {
  url: string
  clone: () => { formData: () => Promise<FormDataLike> }
}

/**
 * Parses the given URLSearchParams into an object.
 * @param queryString the URLSearchParams to parse
 * @returns the parsed object
 * @example
 * const parsed = inputFromSearch(new URLSearchParams('a=1&b=2'))
 * //    ^? { a: '1', b: '2' }
 */
const inputFromSearch = (queryString: URLSearchParams) => {
  const pairs: QueryStringPairs = []
  queryString.forEach((value, key) => pairs.push([key, value]))

  return pairs
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .reduce((parsed, [encodedKey, encodedValue]) => {
      const key = decodeURIComponent(encodedKey)
      const value = decodeURIComponent(encodedValue)
      const compositeKey = key.match(/([^\[\]]*)(\[.*\].*)$/)
      if (compositeKey) {
        const [, rootKey, subKeys] = compositeKey

        const placeValue = (
          current: unknown[] | Record<string, unknown>,
          keys: string[],
          value: string,
        ): void => {
          if (keys.length > 1) {
            // we still have at least 1 nested key
            const [nextKey, ...rest] = keys
            const initialValueFromKeys = (nextKeys: string[]) => 
                  typeof nextKeys[0] === 'string' && !isNaN(Number(nextKeys[0]))
                    ? []
                    : {}
            if (current instanceof Array) {
              const arrayKey = Number(nextKey)
              if (!current[arrayKey]) {
                current[arrayKey] = initialValueFromKeys(rest)
              }
              placeValue(current[arrayKey] as typeof current, rest, value)
            } else {
              if (!current[nextKey]) {
                current[nextKey] = initialValueFromKeys(rest)
              }
              placeValue(current[nextKey] as typeof current, rest, value)
            }
          } else {
            // we are on the last key, assign the value
            const [nextKey] = keys
            if (isNaN(Number(nextKey))) {
              if (!(current instanceof Array)) {
                if (!current[nextKey]) {
                  current[nextKey] = {}
                }
                current[nextKey] = value
              }
            } else {
              if (current instanceof Array) {
                current.push(value)
              }
            }
          }
        }

        const subKeysList = subKeys.replace(/^\[/, '').replace(/\]$/, '').split('][')
        placeValue(parsed, [rootKey, ...subKeysList], value)
        return parsed
      } else {
        // no subkeys here, to its either a simple value or a list
        const existing = parsed[key]
        if (typeof existing === 'string') {
          parsed[key] = [existing, value]
        } else if (existing instanceof Array) {
          const strings = existing as string[]
          strings.push(value)
        } else {
          parsed[key] = value
        }
        return parsed
      }
    }, {} as QueryStringRecord)
}

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

export { inputFromForm, inputFromFormData, inputFromSearch, inputFromUrl }
