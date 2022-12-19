// deno-lint-ignore-file no-namespace
import { DomainFunction, UnpackData } from './types.ts'

/**
 * @deprecated This method will be removed in 2.0.0.
 */
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

  /**
   * @deprecated This method will be removed in 2.0.0.
   */
  export type Mapper<I = unknown, O = unknown> = {
    Index: number
    Value: I
    Return: O
  }
  /**
   * @deprecated This method will be removed in 2.0.0.
   */
  export type Map<M extends Mapper, L extends unknown[]> = IntMapList<M, L, []>
}

/**
 * @deprecated This method will be removed in 2.0.0. Use `UnpackAll` instead.
 */
interface ListToResultData extends List.Mapper<DomainFunction> {
  Return: UnpackData<this['Value']>
}

export type { List, ListToResultData }
