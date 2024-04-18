import { Composable, UnpackData } from '../types.ts'

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

export type { UnpackAll, UnpackDFObject }
