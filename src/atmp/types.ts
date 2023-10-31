type Last<T extends readonly any[]> = T extends [...infer _I, infer L]
  ? L
  : never
type First<T extends readonly any[]> = T extends [infer F, ...infer _I]
  ? F
  : never
type ErrorWithMessage = {
  message: string
  exception?: unknown
  cause?: unknown
}
type Error = {
  success: false,
  errors: Array<ErrorWithMessage>
}
type Success<T> = {
  success: true,
  data: T,
  errors: []
}
type Result<T> = Success<T> | Error

type Fn = (...args: any[]) => any
type Attempt<T extends Fn = Fn> = (
  ...args: Parameters<T>
) => Promise<Result<Awaited<ReturnType<T>>>>

type UnpackResult<T> = Awaited<T> extends Result<infer R> ? R : never

type UnpackAll<List extends Attempt[]> = {
  [K in keyof List]: UnpackResult<ReturnType<List[K]>>
}

type MergeObjs<Objs extends unknown[], output = {}> = Prettify<
  Objs extends [infer first, ...infer rest]
    ? MergeObjs<rest, Omit<output, keyof first> & first>
    : output
>

type Prettify<T> = {
  [K in keyof T]: T[K]
  // deno-lint-ignore ban-types
} & {}

type TupleToUnion<T extends unknown[]> = T[number]

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

export type {
  AtLeastOne,
  Attempt,
  ErrorWithMessage,
  First,
  Fn,
  Last,
  MergeObjs,
  Prettify,
  Result,
  TupleToUnion,
  UnpackAll,
  UnpackResult,
  Success,
  Error
}
