import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import { assertEquals } from 'https://deno.land/std@0.117.0/testing/asserts.ts'

import * as subject from './input-resolvers.ts'

const makePost: (entries: Array<[string, string]>, url?: string) => Request = (
  entries,
  url = 'http://localhost/test',
) =>
  new Request(url, {
    method: 'POST',
    body: new URLSearchParams(entries).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

const makeGet: (entries: Array<[string, string]>, url?: string) => Request = (
  entries,
  url = 'http://localhost/test',
) =>
  new Request(url + '?' + new URLSearchParams(entries).toString(), {
    method: 'GET',
  })

describe('inputFromForm', () => {
  it("extracts the input values from a Request's FormData as an Object", async () => {
    const request = makePost([
      ['foo', 'bar'],
      ['fizz', 'buzz'],
    ])
    assertEquals(await subject.inputFromForm(request), {
      foo: 'bar',
      fizz: 'buzz',
    })
  })

  it('accepts array-like values', async () => {
    const request = makePost([
      ['foo', 'bar'],
      ['arr[]', '1'],
      ['arr[]', '2'],
    ])
    assertEquals(await subject.inputFromForm(request), {
      foo: 'bar',
      arr: ['1', '2'],
    })
  })

  it('accepts structured values', async () => {
    const request = makePost([
      ['person[0][name]', 'John'],
      ['person[0][email]', 'john@email.com'],
      ['person[1][name]', 'Bill'],
      ['person[1][email]', 'bill@email.com'],
    ])
    assertEquals(await subject.inputFromForm(request), {
      person: [
        { name: 'John', email: 'john@email.com' },
        { name: 'Bill', email: 'bill@email.com' },
      ],
    })
  })
})

describe('inputFromUrl', () => {
  it("extracts the input values from a Request's URL as an Object", () => {
    const request = makeGet([
      ['foo', 'bar'],
      ['fizz', 'buzz'],
    ])
    assertEquals(subject.inputFromUrl(request), { foo: 'bar', fizz: 'buzz' })
  })

  it('accepts array-like values', async () => {
    const request = makeGet([
      ['foo', 'bar'],
      ['arr[]', '1'],
      ['arr[]', '2'],
    ])
    assertEquals(await subject.inputFromUrl(request), {
      foo: 'bar',
      arr: ['1', '2'],
    })
  })

  it('accepts structured values', async () => {
    const request = makeGet([
      ['person[0][name]', 'John'],
      ['person[0][email]', 'john@email.com'],
      ['person[1][name]', 'Bill'],
      ['person[1][email]', 'bill@email.com'],
    ])
    assertEquals(await subject.inputFromUrl(request), {
      person: [
        { email: 'john@email.com', name: 'John' },
        { name: 'Bill', email: 'bill@email.com' },
      ],
    })
  })
})

describe('inputFromFormData', () => {
  it('extracts a structured object from a FormData', async () => {
    const request = makePost([
      ['person[0][name]', 'John'],
      ['person[0][email]', 'john@email.com'],
      ['person[1][name]', 'Bill'],
      ['person[1][email]', 'bill@email.com'],
    ])
    assertEquals(subject.inputFromFormData(await request.formData()), {
      person: [
        { name: 'John', email: 'john@email.com' },
        { name: 'Bill', email: 'bill@email.com' },
      ],
    })
  })

  it('accepts manually constructed FormData', () => {
    const formData = new FormData()
    formData.append('email', 'john@doe.com')
    formData.append('tasks[]', 'one')
    formData.append('tasks[]', 'two')
    assertEquals(subject.inputFromFormData(formData), {
      email: 'john@doe.com',
      tasks: ['one', 'two'],
    })
  })
})

describe('inputFromSearch', () => {
  it('extracts a structured object from a URLSearchParams', () => {
    const request = makeGet([
      ['person[0][name]', 'John'],
      ['person[0][email]', 'john@email.com'],
      ['person[1][name]', 'Bill'],
      ['person[1][email]', 'bill@email.com'],
    ])
    assertEquals(subject.inputFromSearch(new URL(request.url).searchParams), {
      person: [
        { email: 'john@email.com', name: 'John' },
        { name: 'Bill', email: 'bill@email.com' },
      ],
    })
  })

  it('accepts manually constructed URLSearchParams', () => {
    const qs = new URLSearchParams()
    qs.append('colors[]', 'red')
    qs.append('colors[]', 'green')
    qs.append('colors[]', 'blue')
    assertEquals(subject.inputFromSearch(qs), {
      colors: ['red', 'green', 'blue'],
    })
  })
})
