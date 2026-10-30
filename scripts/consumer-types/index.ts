import {
  all,
  applySchema,
  branch,
  catchFailure,
  collect,
  composable,
  context,
  map,
  mapErrors,
  mapParameters,
  mergeObjects,
  pipe,
  sequence,
  serialize,
  trace,
  withContext,
} from 'composable-functions'
import type { AnyFn, Composable, UnpackData } from 'composable-functions'

type C = Composable<(n: number) => number>

const inc = composable((n: number) => n + 1)
const show = composable((n: number) => String(n))
const parse = composable((s: string) => Number(s))
const byId = composable((o: { id: number }) => o.id)
const byName = composable((o: { name: string }) => o.name)
const withUser = composable((o: { id: number }, ctx: { user: string }) =>
  o.id + ctx.user
)
const withUserToo = composable((s: string, ctx: { user: string }) => s + ctx.user)
const withRole = composable((s: string, ctx: { role: string }) => s + ctx.role)

export const traceToConsole = trace((result, ...context) => {
  console.info('Trace: ', context)
  console.log('Result: ', JSON.stringify(serialize(result), null, 2))
})

export const tracedInc = traceToConsole(inc)
export const pipeConcrete = pipe(inc, show)
export const allConcrete = all(byId, byName)
export const collectConcrete = collect({ byId, byName })
export const sequenceConcrete = sequence(inc, show)
export const branchConcrete = branch(parse, (n) => (n > 1 ? show : null))
export const mapConcrete = map(byId, (n, input) => ({ n, input }))
export const mapErrorsConcrete = mapErrors(byId, (errors) => errors)
export const mapParametersConcrete = mapParameters(
  byId,
  (id: number) => [{ id }] as [{ id: number }],
)
export const catchFailureConcrete = catchFailure(byId, () => null)
export const mergedConcrete = mergeObjects([{ a: 1 }, { b: 'x' }])
export const schemaConcrete = applySchema()(byId)
export const contextPipeConcrete = withContext.pipe(withUser, withUserToo)
export const contextSequenceConcrete = withContext.sequence(
  withUser,
  withUserToo,
)
export const contextBranchConcrete = withContext.branch(
  withUser,
  () => withUserToo,
)

export const pipeIncompatible = pipe(parse, parse)
export const allIncompatible = all(parse, show)
export const collectIncompatible = collect({ parse, show })
export const sequenceIncompatible = sequence(parse, parse)
export const branchIncompatible = branch(parse, () => parse)
export const contextPipeIncompatible = withContext.pipe(withUser, withRole)
export const contextSequenceIncompatible = withContext.sequence(
  withUser,
  withRole,
)

export const pipeGeneric = <F extends [C, ...C[]]>(...fns: F) => pipe(...fns)
export const allGeneric = <F extends [C, ...C[]]>(...fns: F) => all(...fns)
export const collectGeneric = <F extends Record<string, C>>(fns: F) =>
  collect(fns)
export const sequenceGeneric = <F extends [C, ...C[]]>(...fns: F) =>
  sequence(...fns)
export const branchGeneric = <
  F extends C,
  R extends (o: number) => C | null,
>(fn: F, resolver: R) => branch(fn, resolver)
export const mapGeneric = <F extends C>(fn: F) =>
  map(fn, ((n: number) => n) as any)
export const mapErrorsGeneric = <F extends C>(fn: F) =>
  mapErrors(fn, ((errors: Error[]) => errors) as any)
export const mapParametersGeneric = <F extends C>(fn: F) =>
  mapParameters(fn, ((n: number) => [n]) as any)
export const catchFailureGeneric = <F extends C>(fn: F) =>
  catchFailure(fn, () => 0)
export const composableGeneric = <F extends AnyFn>(fn: F) => composable(fn)
export const tracedGeneric = <F extends C>(fn: F) => trace(() => {})(fn)
export const mergedGeneric = <T extends unknown[]>(objs: T) => mergeObjects(objs)
export const unpackGeneric = <T extends Composable>(_: T) =>
  null as unknown as UnpackData<T>
export const schemaGeneric = <F extends AnyFn>(fn: F) => applySchema()(fn)
export const contextPipeGeneric = <F extends [C, ...C[]]>(...fns: F) =>
  withContext.pipe(...fns)
export const contextSequenceGeneric = <F extends [C, ...C[]]>(...fns: F) =>
  withContext.sequence(...fns)
export const contextBranchGeneric = <
  F extends C,
  R extends (o: number) => C | null,
>(fn: F, resolver: R) => withContext.branch(fn, resolver)
export const contextPipeOfGenericFn = <F extends AnyFn>(fn: F) =>
  withContext.pipe(composable(fn))
export const contextSequenceOfGenericFn = <F extends AnyFn>(fn: F) =>
  withContext.sequence(composable(fn), composable(fn))
export const deprecatedContextPipeOfGenericFn = <F extends AnyFn>(fn: F) =>
  context.pipe(composable(fn))
