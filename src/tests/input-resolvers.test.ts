import { describe, it, assertEquals } from './prelude.ts'
import * as subject from '../input-resolvers.ts'

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
  it('should parse all symbols correctly', async () => {
    const request = makePost([['formula', '3 % 2']])
    assertEquals(await subject.inputFromForm(request), {
      formula: '3 % 2',
    })
  })

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

  it('creates flat objects', () => {
    const qs = new URLSearchParams()
    qs.append('person[name]', 'John')
    qs.append('person[address]', '6 Some Rd')
    assertEquals(subject.inputFromSearch(qs), {
      person: { name: 'John', address: '6 Some Rd' },
    })
  })

  it('creates nested objects', () => {
    const qs = new URLSearchParams()
    qs.append('person[name]', 'John')
    qs.append('person[address][street]', 'Some Rd')
    qs.append('person[address][unit]', '6')
    assertEquals(subject.inputFromSearch(qs), {
      person: { name: 'John', address: { street: 'Some Rd', unit: '6' } },
    })
  })

  it('creates nested objects in arrays', () => {
    const qs = new URLSearchParams()
    qs.append('person[0][name]', 'John')
    qs.append('person[0][address][street]', 'Some Rd')
    qs.append('person[0][address][unit]', '6')
    assertEquals(subject.inputFromSearch(qs), {
      person: [{ name: 'John', address: { street: 'Some Rd', unit: '6' } }],
    })
  })

  it('all together now 🎺', () => {
    const qs = new URLSearchParams()
    qs.append('person[0][name]', 'John')
    qs.append('person[0][address][1][street]', 'Some Rd')
    qs.append('person[0][address][1][unit]', '1')
    qs.append('person[0][address][0][street]', 'Some Rd')
    qs.append('person[0][address][0][unit]', '0')
    qs.append('person[0][address][2][street]', 'Some Rd')
    qs.append('person[0][address][2][unit]', '2')
    qs.append('person[0][address][2][postal-code]', '222')
    qs.append('order', '1')
    qs.append('path', 'home')
    qs.append('path', 'product page')
    qs.append('path', 'purchase')
    qs.append('timestamps[]', '1')
    qs.append('timestamps[]', '2')
    qs.append('timestamps[]', '3')
    qs.append('how-about-multiple-dimensions[0][]', 'we can')
    qs.append('how-about-multiple-dimensions[0][]', 'nest lists')
    qs.append('how-about-multiple-dimensions[1][]', 'so lists of tuples')
    qs.append('how-about-multiple-dimensions[1][]', 'are also possible')
    assertEquals(subject.inputFromSearch(qs), {
      order: '1',
      path: ['home', 'product page', 'purchase'],
      timestamps: ['1', '2', '3'],
      'how-about-multiple-dimensions': [
        ['we can', 'nest lists'],
        ['so lists of tuples', 'are also possible'],
      ],
      person: [
        {
          name: 'John',
          address: [
            { street: 'Some Rd', unit: '0' },
            {
              street: 'Some Rd',
              unit: '1',
            },
            { street: 'Some Rd', unit: '2', 'postal-code': '222' },
          ],
        },
      ],
    })
  })

  it('square brackets are unnecessary to build lists', () => {
    const qs = new URLSearchParams()
    qs.append('colors', 'red')
    qs.append('colors', 'green')
    qs.append('colors', 'blue')
    assertEquals(subject.inputFromSearch(qs), {
      colors: ['red', 'green', 'blue'],
    })
  })

  it('creates array with one element', () => {
    const qs = new URLSearchParams()
    qs.append('colors[0]', 'blue')
    assertEquals(subject.inputFromSearch(qs), {
      colors: ['blue'],
    })
  })

  it('orders elements according to index in query string', () => {
    const qs = new URLSearchParams()
    qs.append('colors[1]', 'red')
    qs.append('colors[0]', 'blue')
    assertEquals(subject.inputFromSearch(qs), {
      colors: ['blue', 'red'],
    })
  })

  it('takes keys encoded as URI components', () => {
    const qs = new URLSearchParams()
    qs.append('some colors[0]', 'blue')
    qs.append('some colors[1]', 'red ish')
    assertEquals(subject.inputFromSearch(qs), {
      'some colors': ['blue', 'red ish'],
    })
  })

  it('takes values encoded as URI components', () => {
    const qs = new URLSearchParams()
    qs.append('colors[0]', 'blue')
    qs.append('colors[1]', 'red ish')
    qs.append('person[name]', 'Average Joe')
    assertEquals(subject.inputFromSearch(qs), {
      colors: ['blue', 'red ish'],
      person: { name: 'Average Joe' },
    })
  })

  it('accepts manually constructed URLSearchParams', () => {
    const qs = new URLSearchParams()
    qs.append('colors[]', 'red')
    qs.append('colors[]', 'blue')
    assertEquals(subject.inputFromSearch(qs), {
      colors: ['red', 'blue'],
    })
  })
})
