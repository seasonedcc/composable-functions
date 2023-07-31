type DataRecord = {
  [key: string]: undefined | string | string[] | DataRecord | DataRecord[]
}

type FormDataLike = Iterable<readonly [PropertyKey, unknown]>
type RequestLike = {
  url: string
  clone: () => { formData: () => Promise<FormDataLike> }
}

function parseQueryString(queryString: string): DataRecord {
  const params = new URLSearchParams(queryString)

  // The final result object.
  let result: any = {}

  // Iterate over each pair of key/value.
  for (const [key, value] of params.entries()) {
    // If the key ends with a square bracket, it means it's an array or object.
    if (/\[\]$/.test(key)) {
      // Get the clean key without the square brackets.
      const cleanKey = key.slice(0, -2)

      // Check if the key already exists in the result object.
      if (result[cleanKey]) {
        // If it does, just push the new value.
        result[cleanKey].push(value)
      } else {
        // If it doesn't, create an array with the value.
        result[cleanKey] = [value]
      }
    } else if (/\[\d+\]\[\w+\]$/.test(key)) {
      // If the key includes indices and properties, it is an array of objects.
      const matches = key.match(/(\w+)\[(\d+)\]\[(\w+)\]/)
      if (matches) {
        const [, arrayKey, index, property] = matches
        if (!result[arrayKey]) {
          result[arrayKey] = []
        }
        if (!result[arrayKey][index]) {
          result[arrayKey][index] = {}
        }
        result[arrayKey][index][property] = decodeURIComponent(value)
      }
    } else {
      // Otherwise, it's a simple key/value pair.
      if (result[key]) {
        // If the key already exists, make it an array and push the new value.
        if (Array.isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [result[key], value]
        }
      } else {
        // If it doesn't, just set the value.
        result[key] = value
      }
    }
  }

  return result
}

const inputFromSearch = (queryString: URLSearchParams) =>
  parseQueryString(queryString.toString())

const inputFromFormData = (formData: FormDataLike) =>
  inputFromSearch(new URLSearchParams(formData as URLSearchParams))

const inputFromForm = async (request: RequestLike) =>
  inputFromFormData(await request.clone().formData())

const inputFromUrl = (request: RequestLike) =>
  inputFromSearch(new URL(request.url).searchParams)

export { inputFromForm, inputFromUrl, inputFromFormData, inputFromSearch }
