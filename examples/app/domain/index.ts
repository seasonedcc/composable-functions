type Options = Omit<RequestInit, 'body'> & { body?: any }
function createApi<T = any>(basePath: string) {
  return async (path: string, options?: Options): Promise<T> =>
    fetch(basePath + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    }).then((res) => res.json())
}

export { createApi }
