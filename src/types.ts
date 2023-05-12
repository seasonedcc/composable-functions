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
  ...infer rest,
]
  ? UnpackAll<rest, [...output, first]>
  : output

type UnionToIntersection<U> = (
  U extends unknown ? (arg: U) => 0 : never
) extends (arg: infer I) => 0
  ? I
  : never;

type LastInUnion<U> = UnionToIntersection<
  U extends unknown ? (x: U) => 0 : never
> extends (x: infer L) => 0
  ? L
  : never;

type UnionToTuple<T, Last = LastInUnion<T>> = [T] extends [never]
  ? []
  : [Last,...UnionToTuple<Exclude<T, Last>>]


type DFsFromObject<DFs extends Record<string, DomainFunction>> = 
  UnionToTuple<DFs[keyof DFs]>

type CollectReturn<Obj extends Record<string, DomainFunction>> =
  | DomainFunction<{ [K in keyof Obj]: UnpackData<Obj[K]> }, TupleToIntersection<UnpackAllInputs<DFsFromObject<Obj>>>, TupleToIntersection<UnpackAllEnvironments<DFsFromObject<Obj>>>>
  | never

type UnpackAllInputs<List, output extends unknown[] = []> = List extends [
  DomainFunction<unknown, infer first>,
  ...infer rest,
]
  ? UnpackAllInputs<rest, [...output, first]>
  : output

type UnpackAllEnvironments<List, output extends unknown[] = []> = List extends [
  DomainFunction<unknown, unknown, infer first>,
  ...infer rest,
]
  ? UnpackAllEnvironments<rest, [...output, first]>
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

type PipeReturn<T extends DomainFunction[]> = 
  Last<T> extends DomainFunction<infer O>
  ? First<T> extends DomainFunction<infer _O, infer I, infer E> ? DomainFunction<O, I, E> : never
  : never

type TypedEnvironment<DF extends DomainFunction> = DF extends DomainFunction<
  infer O,
  unknown,
  infer E
>
  ? (input: unknown, environment: E) => Promise<Result<O>>
  : never

type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L]
  ? L
  : never

type First<T extends readonly unknown[]> = T extends [infer I, ...infer _L]
  ? I
  : never

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

export type {
  AtLeastOne,
  DomainFunction,
  ErrorData,
  ErrorResult,
  ErrorWithMessage,
  First,
  Last,
  MergeObjs,
  PipeReturn,
  Result,
  SchemaError,
  SuccessResult,
  TupleToIntersection,
  TupleToUnion,
  TypedEnvironment,
  UnpackAll,
  UnpackAllEnvironments,
  UnpackAllInputs,
  UnpackData,
  CollectReturn,
  UnpackResult,
  UnpackSuccess,
}
