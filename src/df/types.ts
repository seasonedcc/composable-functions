import { Composable } from '../types.ts'

/**
 * Unpacks the result of a domain function.
 * @example
 * type MyDF = Composable<(input?: unknown, environment?: unknown) => { a: string }>
 * type MyResult = UnpackResult<MyDF>
 * //   ^? SuccessResult<{ a: string }> | ErrorResult
 */
type UnpackResult<F extends Composable> = Awaited<ReturnType<F>>

/**
 * Unpacks the data type of a successful domain function.
 * @example
 * type MyDF = Composable<(input?: unknown, environment?: unknown) => { a: string }>
 * type MyData = UnpackSuccess<MyDF>
 * //   ^? SuccessResult<{ a: string }>
 */
type UnpackSuccess<F extends Composable> = Extract<
  UnpackResult<F>,
  { success: true }
>

/**
 * Unpacks the data type of a successful domain function.
 * @example
 * type MyDF = Composable<(input?: unknown, environment?: unknown) => { a: string }>
 * type MyData = UnpackData<MyDF>
 * //   ^? { a: string }
 */
type UnpackData<F extends Composable> = UnpackSuccess<F>['data']

/**
 * Unpacks a list of Composable into a tuple of their data types.
 * @example
 * type MyDFs = [
 *  Composable<(input?: unknown, environment?: unknown) => { a: string }>,
 *  Composable<(input?: unknown, environment?: unknown) => { b: number }>,
 * ]
 * type MyData = UnpackAll<MyDFs>
 * //   ^? [{ a: string }, { b: number }]
 */
type UnpackAll<List, output extends unknown[] = []> = List extends [
  Composable<(input?: unknown, environment?: unknown) => infer first>,
  ...infer rest,
]
  ? UnpackAll<rest, [...output, first]>
  : output

type UnpackDFObject<Obj extends Record<string, Composable>> =
  | { [K in keyof Obj]: UnpackData<Obj[K]> }
  | never

export type {
  UnpackAll,
  UnpackData,
  UnpackDFObject,
  UnpackResult,
  UnpackSuccess,
}
