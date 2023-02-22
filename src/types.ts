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

type DomainFunction<
  Output = unknown,
  Input = unknown,
  Environment = unknown,
> = {
  (input?: unknown, environment?: unknown): Promise<Result<Output>>
}

type UnpackResult<F extends DomainFunction> = Awaited<ReturnType<F>>

type UnpackSuccess<F extends DomainFunction> = Extract<
  UnpackResult<F>,
  { success: true }
>

type UnpackData<F extends DomainFunction> = UnpackSuccess<F>['data']

type UnpackAll<List, output extends unknown[] = []> = List extends [
  DomainFunction<infer first>,
  ...infer rest
]
  ? UnpackAll<rest, [...output, first]>
  : output

type UnpackDFObject<Obj extends Record<string, DomainFunction>> =
  | { [K in keyof Obj]: UnpackData<Obj[K]> }
  | never

type UnpackAllInputs<List, output extends unknown[] = []> = List extends [
  DomainFunction<unknown, infer first>,
  ...infer rest
]
  ? UnpackAllInputs<rest, [...output, first]>
  : output

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

type TupleToIntersection<
  T extends unknown[],
  output extends unknown = unknown,
> = T extends [infer first, ...infer rest]
  ? TupleToIntersection<rest, output & first>
  : Prettify<output>

type TypedEnvironment<DF extends DomainFunction> = DF extends DomainFunction<infer O, unknown, infer E> ? (input: unknown, environment: E) => Promise<Result<O>> : never

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
  TupleToIntersection,
  TupleToUnion,
  TypedEnvironment,
  UnpackAll,
  UnpackAllInputs,
  UnpackData,
  UnpackDFObject,
  UnpackResult,
  UnpackSuccess,
}
