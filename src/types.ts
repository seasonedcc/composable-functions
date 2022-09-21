type ErrorWithMessage = {
  message: string
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
  (input: unknown, environment?: unknown): Promise<Result<Output>>
}

type UnpackResult<F extends DomainFunction> = Awaited<ReturnType<F>>
type UnpackSuccess<F extends DomainFunction> = Extract<
  UnpackResult<F>,
  { success: true }
>
type UnpackData<F extends DomainFunction> = UnpackSuccess<F>['data']

namespace List {
  type PopList<T extends unknown[]> = T extends [...infer R, unknown] ? R : T
  type PopItem<T extends unknown[]> = T extends [...unknown[], infer A]
    ? A
    : unknown
  type IntMapItem<L extends unknown[], M extends Mapper> = M & {
    Value: PopItem<L>
    Index: PopList<L>['length']
  }
  type IntMapList<
    MapToType extends Mapper,
    ListItems extends unknown[],
    Collected extends unknown[] = [],
  > = ListItems['length'] extends 0
    ? Collected
    : IntMapList<
        MapToType,
        PopList<ListItems>,
        [IntMapItem<ListItems, MapToType>['Return'], ...Collected]
      >

  export type Mapper<I = unknown, O = unknown> = {
    Index: number
    Value: I
    Return: O
  }
  export type Map<M extends Mapper, L extends unknown[]> = IntMapList<M, L, []>
}

interface ListToResultData extends List.Mapper<DomainFunction> {
  Return: UnpackData<this['Value']>
}

type Last<T extends readonly unknown[]> = T extends [...infer _I, infer L]
  ? L
  : never

export type {
  DomainFunction,
  ErrorData,
  ErrorResult,
  ErrorWithMessage,
  Last,
  List,
  ListToResultData,
  Result,
  SchemaError,
  SuccessResult,
  UnpackData,
  UnpackResult,
  UnpackSuccess,
}
