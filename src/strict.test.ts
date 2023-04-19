import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import { z } from 'https://deno.land/x/zod@v3.19.1/mod.ts'

import { makeDomainFunction } from './constructor.ts'
import { strict, strictEnvironment } from './domain-functions.ts'

describe('strict', () => {
  it('returns a function with an input and environment typed with the result of tbheir parsers', () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })

    const handler = makeDomainFunction(parser)(async ({ id }) => id)

    const strictHandler = strict(handler)

    //@ts-expect-error: The strictHandler will only take types that match the result of parser
    strictHandler('this wont type check')

    strictHandler({ id: 1 })
  })
})

describe('strictEnvironment', () => {
  it('returns a function with an input and environment typed with the result of tbheir parsers', () => {
    const parser = z.object({ id: z.preprocess(Number, z.number()) })
    const environmentParser = z.object({ userName: z.string() })

    const handler = makeDomainFunction(
      parser,
      environmentParser,
    )(async ({ id }) => id)

    const strictHandler = strictEnvironment(handler)

    strictHandler(
      'input is unknown, will error on parse',
      //@ts-expect-error: The strictHandler will only take types that match the result of parser on the environment
      "this won't type check",
    )

    strictHandler({ id: 1 })
  })
})
