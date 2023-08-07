/**
 * Items in the errors array returned by failed domain functions.
 */
type ErrorWithMessage = {
  message: string
  exception?: unknown
}

/**
 * A successful domain function result.
 */
type SuccessResult<T = void> = {
  success: true
  data: T
  errors: []
  inputErrors: []
  environmentErrors: []
}

/**
 * A failed domain function result.
 */
type ErrorResult = {
  success: false
  errors: ErrorWithMessage[]
  inputErrors: SchemaError[]
  environmentErrors: SchemaError[]
}

/**
 * Items in the inputErrors and environmentErrors array returned by failed domain functions.
 */
type SchemaError = {
  path: string[]
  message: string
}

/**
 * The properties of the ErrorResult which carry information about what made the domain function fail.
 */
type ErrorData = Omit<ErrorResult, 'success'>

/**
 * The content of the Promise a domain function returns.
 */
type Result<T = void> = SuccessResult<T> | ErrorResult

/**
 * A domain function.
 * It carries the output type which can be further unpacked with UnpackData and other type helpers.
 */
type DomainFunction<Output = unknown> = {
  (input?: unknown, environment?: unknown): Promise<Result<Output>>
}

/**
 * Unpacks the result of a domain function.
 * @example
 * type MyDF = DomainFunction<{ a: string }>
 * type MyResult = UnpackResult<MyDF>
 * //   ^? SuccessResult<{ a: string }> | ErrorResult
 */
type UnpackResult<F extends DomainFunction> = Awaited<ReturnType<F>>

/**
 * Unpacks the data type of a successful domain function.
 * @example
 * type MyDF = DomainFunction<{ a: string }>
 * type MyData = UnpackSuccess<MyDF>
 * //   ^? SuccessResult<{ a: string }>
 */
type UnpackSuccess<F extends DomainFunction> = Extract<
  UnpackResult<F>,
  { success: true }
>

/**
 * Unpacks the data type of a successful domain function.
 * @example
 * type MyDF = DomainFunction<{ a: string }>
 * type MyData = UnpackData<MyDF>
 * //   ^? { a: string }
 */
type UnpackData<F extends DomainFunction> = UnpackSuccess<F>['data']

/**
 * Unpacks a list of DomainFunctions into a tuple of their data types.
 * @example
 * type MyDFs = [
 *  DomainFunction<{ a: string }>,
 *  DomainFunction<{ b: number }>,
 * ]
 * type MyData = UnpackAll<MyDFs>
 * //   ^? [{ a: string }, { b: number }]
 */
type UnpackAll<List, output extends unknown[] = []> = List extends [
  DomainFunction<infer first>,
  ...infer rest,
]
  ? UnpackAll<rest, [...output, first]>
  : output

type UnpackDFObject<Obj extends Record<string, DomainFunction>> =
  | { [K in keyof Obj]: UnpackData<Obj[K]> }
  | never

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
 * Returns the last item of a tuple type.
 * @example
 * type MyTuple = [string, number]
 * type Result = Last<MyTuple>
 * //   ^? number
 */
type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L]
  ? L
  : never

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
  DomainFunction,
  ErrorData,
  ErrorResult,
  ErrorWithMessage,
  Last,
  MergeObjs,
  Result,
  SchemaError,
  SuccessResult,
  TupleToUnion,
  UnpackAll,
  UnpackData,
  UnpackDFObject,
  UnpackResult,
  UnpackSuccess,
}
