/**
 * Returns the last item of a tuple type.
 * @example
 * type MyTuple = [string, number]
 * type Result = Last<MyTuple>
 * //   ^? number
 */
type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L]
  ? L
  : never

type First<T extends readonly any[]> = T extends [infer F, ...infer _I]
  ? F
  : never
type ErrorWithMessage = {
  message: string
  exception?: unknown
}
type Failure = {
  success: false,
  errors: Array<ErrorWithMessage>
}
type Success<T> = {
  success: true,
  data: T,
  errors: []
}
type Result<T> = Success<T> | Failure

type Fn = (...args: any[]) => any
type Attempt<T extends Fn = Fn> = (
  ...args: Parameters<T>
) => Promise<Result<Awaited<ReturnType<T>>>>

type UnpackResult<T> = Awaited<T> extends Result<infer R> ? R : never

type UnpackAll<List extends Attempt[]> = {
  [K in keyof List]: UnpackResult<ReturnType<List[K]>>
}

/**
 * Merges the data types of a list of objects.
 * @example
 * type MyObjs = [
 *   { a: string },
 *   { b: number },
 * ]
 * type MyData = MergeObjs<MyObjs>
 * //   ^? { a: string, b: number }
 */
type MergeObjs<Objs extends unknown[], output = {}> = Objs extends [
  infer first,
  ...infer rest,
]
  ? MergeObjs<rest, Prettify<Omit<output, keyof first> & first>>
  : output

type Prettify<T> = {
  [K in keyof T]: T[K]
  // deno-lint-ignore ban-types
} & {}

/**
 * Converts a tuple type to a union type.
 * @example
 * type MyTuple = [string, number]
 * type MyUnion = TupleToUnion<MyTuple>
 * //   ^? string | number
 */
type TupleToUnion<T extends unknown[]> = T[number]

/**
 * It is similar to Partial<T> but it requires at least one property to be defined.
 * @example
 * type MyType = AtLeastOne<{ a: string, b: number }>
 * const a: MyType = { a: 'hello' }
 * const b: MyType = { b: 123 }
 * const c: MyType = { a: 'hello', b: 123 }
 * // The following won't compile:
 * const d: MyType = {}
 */
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
  Failure
}
