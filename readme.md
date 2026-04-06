<h1 align="center">
  strict-diff
</h1>

<div align="center">
  <a href="https://npmjs.org/package/strict-diff">
    <img src="https://badgen.net/npm/v/strict-diff" alt="version" />
  </a>
  <a href="https://github.com/TomerAberbach/strict-diff/actions">
    <img src="https://github.com/TomerAberbach/strict-diff/workflows/CI/badge.svg" alt="CI" />
  </a>
  <a href="https://unpkg.com/strict-diff/dist/index.js">
    <img src="https://deno.bundlejs.com/?q=strict-diff&badge" alt="gzip size" />
  </a>
  <a href="https://unpkg.com/strict-diff/dist/index.js">
    <img src="https://deno.bundlejs.com/?q=strict-diff&config={%22compression%22:{%22type%22:%22brotli%22}}&badge" alt="brotli size" />
  </a>
  <a href="https://github.com/sponsors/TomerAberbach">
    <img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" alt="Sponsor" />
  </a>
</div>

<div align="center">
  Find all observable differences between two values.
</div>

## Features

- **Strict:** Finds the most minuscule differences between values
- **Structured:** Diff objects have paths and left vs right values
- **Lazy:** Returns a lazy iterable over the diffs

## Install

```sh
$ npm i strict-diff
```

## Usage

```js
import strictDiff from 'strict-diff'

// Primitive value diff
console.log([...strictDiff(1, 2)])
//=> [{ kind: 'value', path: [], left: 1, right: 2 }]

// Type diff
console.log([...strictDiff(null, undefined)])
//=> [{ kind: 'type', path: [], left: 'null', right: 'undefined' }]

// Object property value diff
console.log([...strictDiff({ a: 1 }, { a: 2 })])
//=> [
//     {
//       kind: 'value',
//       path: [
//         { kind: 'property', index: 0, key: 'a' },
//         { kind: 'internal-slot', slot: 'Value' },
//       ],
//       left: 1,
//       right: 2,
//     },
//   ]

// Object key diff
console.log([...strictDiff({ a: 1 }, { b: 1 })])
//=> [{ kind: 'key', path: [], index: 0, left: 'a', right: 'b' }]

// Property descriptor diff (non-writable vs writable)
const left = Object.defineProperty({}, `a`, {
  value: 1,
  writable: false,
  enumerable: true,
  configurable: true,
})
console.log([...strictDiff(left, { a: 1 })])
//=> [
//     {
//       kind: 'value',
//       path: [
//         { kind: 'property', index: 0, key: 'a' },
//         { kind: 'internal-slot', slot: 'Writable' },
//       ],
//       left: false,
//       right: true,
//     },
//   ]

// Reference structure diff (shared object used at different positions)
const shared1 = {}
const shared2 = {}
const leftArray = [shared1, shared2, shared1, shared2]
const rightArray = [shared1, shared2, shared1, shared1]
console.log([...strictDiff(leftArray, rightArray)])
//=> [
//     {
//       kind: 'reference',
//       path: [
//         { kind: 'property', index: 3, key: 3 },
//         { kind: 'internal-slot', slot: 'Value' },
//       ],
//       leftFirstSeenPath: [
//         { kind: 'property', index: 1, key: 1 },
//         { kind: 'internal-slot', slot: 'Value' },
//       ],
//       rightFirstSeenPath: [
//         { kind: 'property', index: 0, key: 0 },
//         { kind: 'internal-slot', slot: 'Value' },
//       ],
//     },
//   ]

// Lazily iterated
const diffs = strictDiff({ a: 1, b: 2 }, { a: 99, b: 99 })
const [firstDiff] = diffs
console.log(firstDiff)
//=> {
//     kind: 'value',
//     path: [
//       { kind: 'property', index: 0, key: 'a' },
//       { kind: 'internal-slot', slot: 'Value' },
//     ],
//     left: 1,
//     right: 99,
//   }
```

See [the tests](./src/index.test.ts) for other example diffs.

## Contributing

Stars are always welcome!

For bugs and feature requests,
[please create an issue](https://github.com/TomerAberbach/strict-diff/issues/new).

## License

[MIT](https://github.com/TomerAberbach/strict-diff/blob/main/license) ©
[Tomer Aberbach](https://github.com/TomerAberbach)
