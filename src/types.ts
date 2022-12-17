type ErrorWithMessage = {
  message: string
  exception?: unknown
}

type SuccessResult<T = void> = {
  success: true
  data: T
  errors: []
  inputErrors: []
  environmentErrors: []
}
type ErrorResult = {
  success: false
  errors: ErrorWithMessage[]
  inputErrors: SchemaError[]
  environmentErrors: SchemaError[]
}
type SchemaError = {
  path: string[]
  message: string
}

type ErrorData = Omit<ErrorResult, 'success'>

type Result<T = void> = SuccessResult<T> | ErrorResult

type DomainFunction<Output = unknown> = {
  (input?: unknown, environment?: unknown): Promise<Result<Output>>
}

type UnpackResult<F extends DomainFunction> = Awaited<ReturnType<F>>

type UnpackSuccess<F extends DomainFunction> = Extract<
  UnpackResult<F>,
  { success: true }
>

type UnpackData<F extends DomainFunction> = UnpackSuccess<F>['data']

type UnpackAll<List> = List extends [DomainFunction<infer first>, ...infer rest]
  ? [first, ...UnpackAll<rest>]
  : []

type MergeObjs<Objs extends unknown[]> = Objs extends [
  infer First,
  ...infer Rest,
]
  ? First & MergeObjs<Rest>
  : {}

type TupleToUnion<T extends unknown[]> = T[number]

type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L]
  ? L
  : never

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
  UnpackResult,
  UnpackSuccess,
}
