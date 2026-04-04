/* eslint-disable unicorn/new-for-builtins */
/* eslint-disable require-unicode-regexp */
/* eslint-disable id-length */

import { fc, test } from '@fast-check/vitest'
import { expect } from 'vitest'
import strictDiff from './index.ts'
import type { Diff } from './index.ts'

type Case = {
  name: string
  left: unknown
  right: unknown
  diffs: Diff[]
}

const cases: Case[] = [
  // Null and undefined
  { name: `equal nulls`, left: null, right: null, diffs: [] },
  { name: `equal undefineds`, left: undefined, right: undefined, diffs: [] },
  {
    name: `non-equal null and undefined`,
    left: null,
    right: undefined,
    diffs: [{ kind: `type`, path: [], left: `null`, right: `undefined` }],
  },

  // Boolean
  { name: `equal false booleans`, left: false, right: false, diffs: [] },
  { name: `equal true booleans`, left: true, right: true, diffs: [] },
  {
    name: `non-equal booleans`,
    left: true,
    right: false,
    diffs: [{ kind: `value`, path: [], left: true, right: false }],
  },

  // Number
  { name: `equal numbers`, left: 1.1, right: 1.1, diffs: [] },
  { name: `equal integers`, left: 1, right: 1, diffs: [] },
  { name: `equal +0`, left: 0, right: 0, diffs: [] },
  { name: `equal -0`, left: -0, right: -0, diffs: [] },
  { name: `equal Infinity`, left: Infinity, right: Infinity, diffs: [] },
  { name: `equal -Infinity`, left: -Infinity, right: -Infinity, diffs: [] },
  { name: `equal NaN`, left: Number.NaN, right: Number.NaN, diffs: [] },
  {
    name: `non-equal integers`,
    left: 1,
    right: 2,
    diffs: [{ kind: `value`, path: [], left: 1, right: 2 }],
  },
  {
    name: `non-equal -0 and +0`,
    left: -0,
    right: 0,
    diffs: [{ kind: `value`, path: [], left: -0, right: 0 }],
  },

  // String
  { name: `equal strings`, left: `hello`, right: `hello`, diffs: [] },
  {
    name: `non-equal strings`,
    left: `hello`,
    right: `hi`,
    diffs: [{ kind: `value`, path: [], left: `hello`, right: `hi` }],
  },

  // Objects
  { name: `equal empty objects`, left: {}, right: {}, diffs: [] },
  { name: `equal objects`, left: { a: 1 }, right: { a: 1 }, diffs: [] },
  {
    name: `non-equal object property values`,
    left: { a: 1 },
    right: { a: 2 },
    diffs: [
      {
        kind: `value`,
        path: [
          { kind: `property`, index: 0, key: `a` },
          { kind: `internal-slot`, slot: `Value` },
        ],
        left: 1,
        right: 2,
      },
    ],
  },
  {
    name: `non-equal object keys`,
    left: { a: 1 },
    right: { b: 1 },
    diffs: [{ kind: `key`, path: [], index: 0, left: `a`, right: `b` }],
  },
  {
    name: `non-equal objects with extra key on right`,
    left: {},
    right: { a: 1 },
    diffs: [{ kind: `key`, path: [], index: 0, left: undefined, right: `a` }],
  },
  {
    name: `non-equal objects with non-writable vs writable property`,
    left: Object.defineProperty({}, `a`, {
      value: 1,
      writable: false,
      enumerable: true,
      configurable: true,
    }),
    right: { a: 1 },
    diffs: [
      {
        kind: `value`,
        path: [
          { kind: `property`, index: 0, key: `a` },
          { kind: `internal-slot`, slot: `Writable` },
        ],
        left: false,
        right: true,
      },
    ],
  },
  {
    name: `non-equal objects with non-extensible vs extensible`,
    left: Object.preventExtensions({}),
    right: {},
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Extensible` }],
        left: false,
        right: true,
      },
    ],
  },
  {
    name: `non-equal object prototypes`,
    left: Object.create(null) as object,
    right: {},
    diffs: [
      {
        kind: `type`,
        path: [{ kind: `internal-slot`, slot: `Prototype` }],
        left: `null`,
        right: `Object`,
      },
    ],
  },
  (() => {
    const symbol = Symbol(`test`)
    return {
      name: `equal objects with symbol keys`,
      left: { [symbol]: 1 },
      right: { [symbol]: 1 },
      diffs: [],
    }
  })(),
  (() => {
    const symbol = Symbol(`test`)
    return {
      name: `non-equal object symbol key values`,
      left: { [symbol]: 1 },
      right: { [symbol]: 2 },
      diffs: [
        {
          kind: `value`,
          path: [
            { kind: `property`, index: 0, key: symbol },
            { kind: `internal-slot`, slot: `Value` },
          ],
          left: 1,
          right: 2,
        },
      ],
    }
  })(),
  (() => {
    const left: Record<string, unknown> = {}
    left.self = left
    const right: Record<string, unknown> = {}
    right.self = right
    return {
      name: `equal circular references with same structure`,
      left,
      right,
      diffs: [],
    }
  })(),
  (() => {
    const leftShared = {}
    const left = [leftShared, leftShared]
    const rightShared = {}
    const right = [rightShared, rightShared]
    return {
      name: `equal shared references with same structure`,
      left,
      right,
      diffs: [],
    }
  })(),
  (() => {
    const leftShared1 = {}
    const leftShared2 = {}
    const left = [leftShared1, leftShared2, leftShared1, leftShared2]
    const rightShared1 = {}
    const rightShared2 = {}
    const right = [rightShared1, rightShared2, rightShared1, rightShared1]
    return {
      name: `non-equal shared references with partially same structure`,
      left,
      right,
      diffs: [
        {
          kind: `reference`,
          path: [
            { index: 3, key: 3, kind: `property` },
            { kind: `internal-slot`, slot: `Value` },
          ],
          leftFirstSeenPath: [
            { index: 1, key: 1, kind: `property` },
            { kind: `internal-slot`, slot: `Value` },
          ],
          rightFirstSeenPath: [
            { index: 0, key: 0, kind: `property` },
            { kind: `internal-slot`, slot: `Value` },
          ],
        },
      ],
    }
  })(),
  (() => {
    const shared = {}
    const left = { x: shared, y: shared }
    const right = { x: {}, y: {} }
    const xValuePath = [
      { kind: `property` as const, index: 0, key: `x` },
      { kind: `internal-slot` as const, slot: `Value` },
    ]
    const yValuePath = [
      { kind: `property` as const, index: 1, key: `y` },
      { kind: `internal-slot` as const, slot: `Value` },
    ]
    return {
      name: `non-equal shared reference vs non-shared reference`,
      left,
      right,
      diffs: [
        {
          kind: `reference` as const,
          path: yValuePath,
          leftFirstSeenPath: xValuePath,
          rightFirstSeenPath: undefined,
        },
      ],
    }
  })(),

  // Arrays
  { name: `equal arrays`, left: [1, 2], right: [1, 2], diffs: [] },
  {
    name: `non-equal array elements`,
    left: [1, 2],
    right: [1, 3],
    diffs: [
      {
        kind: `value`,
        path: [
          { kind: `property`, index: 1, key: 1 },
          { kind: `internal-slot`, slot: `Value` },
        ],
        left: 2,
        right: 3,
      },
    ],
  },

  // Boolean wrappers
  {
    name: `equal Boolean wrappers`,
    left: Object(true),
    right: Object(true),
    diffs: [],
  },
  {
    name: `non-equal Boolean wrappers`,
    left: Object(true),
    right: Object(false),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `BooleanData` }],
        left: true,
        right: false,
      },
    ],
  },

  // Number wrappers
  {
    name: `equal Number wrappers`,
    left: Object(1),
    right: Object(1),
    diffs: [],
  },
  {
    name: `non-equal Number wrappers`,
    left: Object(1),
    right: Object(2),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `NumberData` }],
        left: 1,
        right: 2,
      },
    ],
  },

  // BigInt wrappers
  {
    name: `equal BigInt wrappers`,
    left: Object(1n),
    right: Object(1n),
    diffs: [],
  },
  {
    name: `non-equal BigInt wrappers`,
    left: Object(1n),
    right: Object(2n),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `BigIntData` }],
        left: 1n,
        right: 2n,
      },
    ],
  },

  // String wrappers
  {
    name: `equal String wrappers`,
    left: Object(`a`),
    right: Object(`a`),
    diffs: [],
  },
  {
    name: `non-equal String wrappers`,
    left: Object(`a`),
    right: Object(`b`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `StringData` }],
        left: `a`,
        right: `b`,
      },
      {
        kind: `value`,
        path: [
          { kind: `property`, index: 0, key: 0 },
          { kind: `internal-slot`, slot: `Value` },
        ],
        left: `a`,
        right: `b`,
      },
    ],
  },

  // Symbol wrappers
  (() => {
    const symbol = Symbol(`test`)
    return {
      name: `equal Symbol wrappers`,
      left: Object(symbol),
      right: Object(symbol),
      diffs: [],
    }
  })(),
  (() => {
    const symbol1 = Symbol(`a`)
    const symbol2 = Symbol(`b`)
    return {
      name: `non-equal Symbol wrappers`,
      left: Object(symbol1),
      right: Object(symbol2),
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `SymbolData` }],
          left: symbol1,
          right: symbol2,
        },
      ],
    }
  })(),

  // Map
  {
    name: `equal Maps`,
    left: new Map([[1, `a`]]),
    right: new Map([[1, `a`]]),
    diffs: [],
  },
  {
    name: `non-equal Map entry values`,
    left: new Map([[1, `a`]]),
    right: new Map([[1, `b`]]),
    diffs: [
      {
        kind: `value`,
        path: [
          { kind: `internal-slot`, slot: `MapData` },
          { kind: `property`, index: 0, key: 0 },
          { kind: `internal-slot`, slot: `Value` },
          { kind: `property`, index: 1, key: 1 },
          { kind: `internal-slot`, slot: `Value` },
        ],
        left: `a`,
        right: `b`,
      },
    ],
  },

  // Set
  {
    name: `equal Sets`,
    left: new Set([1, 2]),
    right: new Set([1, 2]),
    diffs: [],
  },
  {
    name: `non-equal Set values`,
    left: new Set([1, 2]),
    right: new Set([1, 3]),
    diffs: [
      {
        kind: `value`,
        path: [
          { kind: `internal-slot`, slot: `SetData` },
          { kind: `property`, index: 1, key: 1 },
          { kind: `internal-slot`, slot: `Value` },
        ],
        left: 2,
        right: 3,
      },
    ],
  },

  // Function
  (() => {
    const [left, right] = [() => {}, () => {}]
    return { name: `equal anonymous functions`, left, right, diffs: [] }
  })(),
  (() => {
    const [left, right] = [() => 1, () => 2]
    return {
      name: `non-equal function bodies`,
      left,
      right,
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `SourceText` }],
          left: `() => 1`,
          right: `() => 2`,
        },
      ],
    }
  })(),
  (() => {
    const [left, right] = [function* () {}, function* () {}]
    return { name: `equal generator functions`, left, right, diffs: [] }
  })(),
  (() => {
    const [left, right] = [
      function* () {
        yield 1
      },
      function* () {
        yield 2
      },
    ]
    return {
      name: `non-equal generator function bodies`,
      left,
      right,
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `SourceText` }],
          left: `function* () {\n        yield 1;\n      }`,
          right: `function* () {\n        yield 2;\n      }`,
        },
      ],
    }
  })(),
  (() => {
    const [left, right] = [async () => {}, async () => {}]
    return { name: `equal async functions`, left, right, diffs: [] }
  })(),
  (() => {
    const [left, right] = [async () => 1, async () => 2]
    return {
      name: `non-equal async function bodies`,
      left,
      right,
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `SourceText` }],
          left: `async () => 1`,
          right: `async () => 2`,
        },
      ],
    }
  })(),
  (() => {
    const foo = () => {}
    const bar = () => {}
    return {
      name: `non-equal function names`,
      left: foo,
      right: bar,
      diffs: [
        {
          kind: `value`,
          path: [
            { kind: `property`, index: 1, key: `name` },
            { kind: `internal-slot`, slot: `Value` },
          ],
          left: `foo`,
          right: `bar`,
        },
      ],
    }
  })(),
  (() => {
    const [left, right] = [
      (_a: unknown) => {},
      (_a: unknown, _b: unknown) => {},
    ]
    return {
      name: `non-equal function lengths`,
      left,
      right,
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `SourceText` }],
          left: `(_a) => {\n      }`,
          right: `(_a, _b) => {\n      }`,
        },
        {
          kind: `value`,
          path: [
            { kind: `property`, index: 0, key: `length` },
            { kind: `internal-slot`, slot: `Value` },
          ],
          left: 1,
          right: 2,
        },
      ],
    }
  })(),
  {
    name: `non-equal async function vs non-async function`,
    left: async () => {},
    right: () => {},
    diffs: [
      { kind: `type`, path: [], left: `AsyncFunction`, right: `Function` },
    ],
  },
  {
    name: `non-equal generator function vs non-generator function`,
    *left() {},
    right: () => {},
    diffs: [
      { kind: `type`, path: [], left: `GeneratorFunction`, right: `Function` },
    ],
  },
  {
    name: `non-equal async generator function vs async function`,
    async *left() {},
    right: async () => {},
    diffs: [
      {
        kind: `type`,
        path: [],
        left: `AsyncGeneratorFunction`,
        right: `AsyncFunction`,
      },
    ],
  },

  // Date
  { name: `equal Dates`, left: new Date(0), right: new Date(0), diffs: [] },
  {
    name: `non-equal Date values`,
    left: new Date(0),
    right: new Date(1),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `DateValue` }],
        left: 0,
        right: 1,
      },
    ],
  },

  // RegExp
  { name: `equal RegExps`, left: /foo/g, right: /foo/g, diffs: [] },
  {
    name: `non-equal RegExp sources`,
    left: /foo/,
    right: /bar/,
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `OriginalSource` }],
        left: `foo`,
        right: `bar`,
      },
    ],
  },
  {
    name: `non-equal RegExp flags`,
    left: /foo/g,
    right: /foo/i,
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `OriginalFlags` }],
        left: `g`,
        right: `i`,
      },
    ],
  },
  {
    name: `non-equal RegExps`,
    left: /foo/g,
    right: /bar/i,
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `OriginalSource` }],
        left: `foo`,
        right: `bar`,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `OriginalFlags` }],
        left: `g`,
        right: `i`,
      },
    ],
  },

  // URL
  {
    name: `equal URLs`,
    left: new URL(`https://example.com`),
    right: new URL(`https://example.com`),
    diffs: [],
  },
  {
    name: `non-equal URL paths`,
    left: new URL(`https://example.com/a`),
    right: new URL(`https://example.com/b`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `href` }],
        left: `https://example.com/a`,
        right: `https://example.com/b`,
      },
    ],
  },

  // URLSearchParams
  {
    name: `equal URLSearchParams`,
    left: new URLSearchParams(`a=1`),
    right: new URLSearchParams(`a=1`),
    diffs: [],
  },
  {
    name: `non-equal URLSearchParams values`,
    left: new URLSearchParams(`a=1`),
    right: new URLSearchParams(`a=2`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `list` }],
        left: `a=1`,
        right: `a=2`,
      },
    ],
  },

  // WeakRef
  {
    name: `equal WeakRefs`,
    left: new WeakRef({}),
    right: new WeakRef({}),
    diffs: [],
  },
  {
    name: `non-equal WeakRefs`,
    left: new WeakRef({ a: 1 }),
    right: new WeakRef({ a: 2 }),
    diffs: [
      {
        kind: `value`,
        path: [
          { kind: `internal-slot`, slot: `WeakRefTarget` },
          { kind: `property`, index: 0, key: `a` },
          { kind: `internal-slot`, slot: `Value` },
        ],
        left: 1,
        right: 2,
      },
    ],
  },

  // ArrayBuffer
  {
    name: `equal ArrayBuffers`,
    left: new ArrayBuffer(4),
    right: new ArrayBuffer(4),
    diffs: [],
  },
  (() => {
    const buffer1 = new ArrayBuffer(4)
    buffer1.transfer()
    const buffer2 = new ArrayBuffer(8)
    buffer2.transfer()
    return {
      name: `equal detached ArrayBuffers`,
      left: buffer1,
      right: buffer2,
      diffs: [],
    }
  })(),
  (() => {
    const left = new ArrayBuffer(4)
    new DataView(left).setUint8(0, 1)
    const right = new ArrayBuffer(4)
    new DataView(right).setUint8(0, 2)
    return {
      name: `non-equal ArrayBuffer bytes`,
      left,
      right,
      diffs: [
        {
          kind: `value`,
          path: [
            { kind: `internal-slot`, slot: `ArrayBufferData` },
            { kind: `property`, index: 0, key: 0 },
            { kind: `internal-slot`, slot: `Value` },
          ],
          left: 1,
          right: 2,
        },
      ],
    }
  })(),
  {
    name: `non-equal ArrayBuffer maxByteLengths`,
    left: new ArrayBuffer(4, { maxByteLength: 8 }),
    right: new ArrayBuffer(4, { maxByteLength: 16 }),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `ArrayBufferMaxByteLength` }],
        left: 8,
        right: 16,
      },
    ],
  },
  {
    name: `non-equal ArrayBuffers`,
    left: new ArrayBuffer(4),
    right: new ArrayBuffer(8),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `ArrayBufferByteLength` }],
        left: 4,
        right: 8,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `ArrayBufferMaxByteLength` }],
        left: 4,
        right: 8,
      },
      {
        kind: `key`,
        path: [{ kind: `internal-slot`, slot: `ArrayBufferData` }],
        index: 4,
        left: `length`,
        right: 4,
      },
      {
        kind: `key`,
        path: [{ kind: `internal-slot`, slot: `ArrayBufferData` }],
        index: 5,
        left: undefined,
        right: 5,
      },
      {
        kind: `key`,
        path: [{ kind: `internal-slot`, slot: `ArrayBufferData` }],
        index: 6,
        left: undefined,
        right: 6,
      },
      {
        kind: `key`,
        path: [{ kind: `internal-slot`, slot: `ArrayBufferData` }],
        index: 7,
        left: undefined,
        right: 7,
      },
      {
        kind: `key`,
        path: [{ kind: `internal-slot`, slot: `ArrayBufferData` }],
        index: 8,
        left: undefined,
        right: `length`,
      },
    ],
  },

  // TypedArray
  {
    name: `equal Uint8Arrays`,
    left: new Uint8Array([1, 2, 3]),
    right: new Uint8Array([1, 2, 3]),
    diffs: [],
  },
  (() => {
    const buf = new ArrayBuffer(8)
    return {
      name: `non-equal Uint8Array byteOffsets`,
      left: new Uint8Array(buf, 0, 4),
      right: new Uint8Array(buf, 4, 4),
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `ByteOffset` }],
          left: 0,
          right: 4,
        },
      ],
    }
  })(),
  (() => {
    const buffer = new ArrayBuffer(8)
    return {
      name: `non-equal Uint8Array byteLengths`,
      left: new Uint8Array(buffer, 0, 4),
      right: new Uint8Array(buffer, 0, 6),
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `ByteLength` }],
          left: 4,
          right: 6,
        },
        {
          kind: `key`,
          path: [],
          index: 4,
          left: undefined,
          right: 4,
        },
        {
          kind: `key`,
          path: [],
          index: 5,
          left: undefined,
          right: 5,
        },
      ],
    }
  })(),
  {
    name: `non-equal Uint8Array buffers`,
    left: new Uint8Array([1, 2, 3]),
    right: new Uint8Array([1, 2, 4]),
    diffs: [
      {
        kind: `value`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferData` },
          { kind: `property`, index: 2, key: 2 },
          { kind: `internal-slot`, slot: `Value` },
        ],
        left: 3,
        right: 4,
      },
      {
        kind: `value`,
        path: [
          { kind: `property`, index: 2, key: 2 },
          { kind: `internal-slot`, slot: `Value` },
        ],
        left: 3,
        right: 4,
      },
    ],
  },
  {
    name: `non-equal Uint8Arrays`,
    left: new Uint8Array(new ArrayBuffer(4)),
    right: new Uint8Array(new ArrayBuffer(6), 2, 2),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `ByteOffset` }],
        left: 0,
        right: 2,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `ByteLength` }],
        left: 4,
        right: 2,
      },
      {
        kind: `value`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferByteLength` },
        ],
        left: 4,
        right: 6,
      },
      {
        kind: `value`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferMaxByteLength` },
        ],
        left: 4,
        right: 6,
      },
      {
        kind: `key`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferData` },
        ],
        index: 4,
        left: `length`,
        right: 4,
      },
      {
        kind: `key`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferData` },
        ],
        index: 5,
        left: undefined,
        right: 5,
      },
      {
        kind: `key`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferData` },
        ],
        index: 6,
        left: undefined,
        right: `length`,
      },
      {
        kind: `key`,
        path: [],
        index: 2,
        left: 2,
        right: undefined,
      },
      {
        kind: `key`,
        path: [],
        index: 3,
        left: 3,
        right: undefined,
      },
    ],
  },

  // DataView
  {
    name: `equal DataViews`,
    left: new DataView(new ArrayBuffer(4)),
    right: new DataView(new ArrayBuffer(4)),
    diffs: [],
  },
  (() => {
    const buf = new ArrayBuffer(8)
    return {
      name: `non-equal DataView byteOffsets`,
      left: new DataView(buf, 0, 4),
      right: new DataView(buf, 4, 4),
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `ByteOffset` }],
          left: 0,
          right: 4,
        },
      ],
    }
  })(),
  (() => {
    const buf = new ArrayBuffer(8)
    return {
      name: `non-equal DataView byteLengths`,
      left: new DataView(buf, 0, 4),
      right: new DataView(buf, 0, 6),
      diffs: [
        {
          kind: `value`,
          path: [{ kind: `internal-slot`, slot: `ByteLength` }],
          left: 4,
          right: 6,
        },
      ],
    }
  })(),
  (() => {
    const left = new ArrayBuffer(4)
    new DataView(left).setUint8(0, 1)
    const right = new ArrayBuffer(4)
    new DataView(right).setUint8(0, 2)
    return {
      name: `non-equal DataView buffers`,
      left: new DataView(left),
      right: new DataView(right),
      diffs: [
        {
          kind: `value`,
          path: [
            { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
            { kind: `internal-slot`, slot: `ArrayBufferData` },
            { kind: `property`, index: 0, key: 0 },
            { kind: `internal-slot`, slot: `Value` },
          ],
          left: 1,
          right: 2,
        },
      ],
    }
  })(),
  {
    name: `non-equal DataViews`,
    left: new DataView(new ArrayBuffer(4), 0, 4),
    right: new DataView(new ArrayBuffer(6), 2, 2),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `ByteOffset` }],
        left: 0,
        right: 2,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `ByteLength` }],
        left: 4,
        right: 2,
      },
      {
        kind: `value`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferByteLength` },
        ],
        left: 4,
        right: 6,
      },
      {
        kind: `value`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferMaxByteLength` },
        ],
        left: 4,
        right: 6,
      },
      {
        kind: `key`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferData` },
        ],
        index: 4,
        left: `length`,
        right: 4,
      },
      {
        kind: `key`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferData` },
        ],
        index: 5,
        left: undefined,
        right: 5,
      },
      {
        kind: `key`,
        path: [
          { kind: `internal-slot`, slot: `ViewedArrayBuffer` },
          { kind: `internal-slot`, slot: `ArrayBufferData` },
        ],
        index: 6,
        left: undefined,
        right: `length`,
      },
    ],
  },

  // Temporal.Duration
  {
    name: `equal Durations`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    diffs: [],
  },
  {
    name: `non-equal Duration years`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(2, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Years` }],
        left: 1,
        right: 2,
      },
    ],
  },
  {
    name: `non-equal Duration months`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 3, 3, 4, 5, 6, 7, 8, 9, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Months` }],
        left: 2,
        right: 3,
      },
    ],
  },
  {
    name: `non-equal Duration weeks`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 4, 4, 5, 6, 7, 8, 9, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Weeks` }],
        left: 3,
        right: 4,
      },
    ],
  },
  {
    name: `non-equal Duration days`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 3, 5, 5, 6, 7, 8, 9, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Days` }],
        left: 4,
        right: 5,
      },
    ],
  },
  {
    name: `non-equal Duration hours`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 3, 4, 6, 6, 7, 8, 9, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Hours` }],
        left: 5,
        right: 6,
      },
    ],
  },
  {
    name: `non-equal Duration minutes`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 3, 4, 5, 7, 7, 8, 9, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Minutes` }],
        left: 6,
        right: 7,
      },
    ],
  },
  {
    name: `non-equal Duration seconds`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 3, 4, 5, 6, 8, 8, 9, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Seconds` }],
        left: 7,
        right: 8,
      },
    ],
  },
  {
    name: `non-equal Duration milliseconds`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 9, 9, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Milliseconds` }],
        left: 8,
        right: 9,
      },
    ],
  },
  {
    name: `non-equal Duration microseconds`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 10, 10),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Microseconds` }],
        left: 9,
        right: 10,
      },
    ],
  },
  {
    name: `non-equal Duration nanoseconds`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 11),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Nanoseconds` }],
        left: 10,
        right: 11,
      },
    ],
  },
  {
    name: `non-equal Durations`,
    left: new Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    right: new Temporal.Duration(),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Years` }],
        left: 1,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Months` }],
        left: 2,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Weeks` }],
        left: 3,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Days` }],
        left: 4,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Hours` }],
        left: 5,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Minutes` }],
        left: 6,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Seconds` }],
        left: 7,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Milliseconds` }],
        left: 8,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Microseconds` }],
        left: 9,
        right: 0,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Nanoseconds` }],
        left: 10,
        right: 0,
      },
    ],
  },

  // Temporal.Instant
  {
    name: `equal Instants`,
    left: new Temporal.Instant(1_000_000n),
    right: new Temporal.Instant(1_000_000n),
    diffs: [],
  },
  {
    name: `non-equal Instant epochNanoseconds`,
    left: new Temporal.Instant(1_000_000n),
    right: new Temporal.Instant(2_000_000n),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `EpochNanoseconds` }],
        left: 1_000_000n,
        right: 2_000_000n,
      },
    ],
  },

  // Temporal.PlainDate
  {
    name: `equal PlainDates`,
    left: new Temporal.PlainDate(2024, 1, 15),
    right: new Temporal.PlainDate(2024, 1, 15),
    diffs: [],
  },
  {
    name: `non-equal PlainDate calendar`,
    left: new Temporal.PlainDate(2024, 1, 15, `iso8601`),
    right: new Temporal.PlainDate(2024, 1, 15, `gregory`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
    ],
  },
  {
    name: `non-equal PlainDate year`,
    left: new Temporal.PlainDate(2024, 1, 15),
    right: new Temporal.PlainDate(2025, 1, 15),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Year` }],
        left: 2024,
        right: 2025,
      },
    ],
  },
  {
    name: `non-equal PlainDate month`,
    left: new Temporal.PlainDate(2024, 1, 15),
    right: new Temporal.PlainDate(2024, 2, 15),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Month` }],
        left: 1,
        right: 2,
      },
    ],
  },
  {
    name: `non-equal PlainDate day`,
    left: new Temporal.PlainDate(2024, 1, 15),
    right: new Temporal.PlainDate(2024, 1, 16),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Day` }],
        left: 15,
        right: 16,
      },
    ],
  },
  {
    name: `non-equal PlainDates`,
    left: new Temporal.PlainDate(2024, 1, 15, `iso8601`),
    right: new Temporal.PlainDate(2025, 2, 16, `gregory`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Year` }],
        left: 2024,
        right: 2025,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Month` }],
        left: 1,
        right: 2,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Day` }],
        left: 15,
        right: 16,
      },
    ],
  },

  // Temporal.PlainDateTime
  {
    name: `equal PlainDateTimes`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    diffs: [],
  },
  {
    name: `non-equal PlainDateTime calendar`,
    left: new Temporal.PlainDateTime(
      2024,
      1,
      15,
      10,
      30,
      0,
      0,
      0,
      0,
      `iso8601`,
    ),
    right: new Temporal.PlainDateTime(
      2024,
      1,
      15,
      10,
      30,
      0,
      0,
      0,
      0,
      `gregory`,
    ),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime year`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2025, 1, 15, 10, 30, 0, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Year` }],
        left: 2024,
        right: 2025,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime month`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 2, 15, 10, 30, 0, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Month` }],
        left: 1,
        right: 2,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime day`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 1, 16, 10, 30, 0, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Day` }],
        left: 15,
        right: 16,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime hour`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 1, 15, 11, 30, 0, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Hour` }],
        left: 10,
        right: 11,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime minute`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 1, 15, 10, 31, 0, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Minute` }],
        left: 30,
        right: 31,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime second`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 1, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Second` }],
        left: 0,
        right: 1,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime millisecond`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 1, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Millisecond` }],
        left: 0,
        right: 1,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime microsecond`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 1, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Microsecond` }],
        left: 0,
        right: 1,
      },
    ],
  },
  {
    name: `non-equal PlainDateTime nanosecond`,
    left: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0, 0, 0, 1),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Nanosecond` }],
        left: 0,
        right: 1,
      },
    ],
  },
  {
    name: `non-equal PlainDateTimes`,
    left: new Temporal.PlainDateTime(
      2024,
      1,
      15,
      10,
      30,
      0,
      0,
      0,
      0,
      `iso8601`,
    ),
    right: new Temporal.PlainDateTime(
      2025,
      2,
      16,
      11,
      31,
      1,
      1,
      1,
      1,
      `gregory`,
    ),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Year` }],
        left: 2024,
        right: 2025,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Month` }],
        left: 1,
        right: 2,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Day` }],
        left: 15,
        right: 16,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Hour` }],
        left: 10,
        right: 11,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Minute` }],
        left: 30,
        right: 31,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Second` }],
        left: 0,
        right: 1,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Millisecond` }],
        left: 0,
        right: 1,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Microsecond` }],
        left: 0,
        right: 1,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Nanosecond` }],
        left: 0,
        right: 1,
      },
    ],
  },

  // Temporal.PlainMonthDay
  {
    name: `equal PlainMonthDays`,
    left: new Temporal.PlainMonthDay(3, 14),
    right: new Temporal.PlainMonthDay(3, 14),
    diffs: [],
  },
  {
    name: `non-equal PlainMonthDay calendar`,
    left: new Temporal.PlainMonthDay(3, 14, `iso8601`),
    right: new Temporal.PlainMonthDay(3, 14, `gregory`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
    ],
  },
  {
    name: `non-equal PlainMonthDay monthCode`,
    left: new Temporal.PlainMonthDay(3, 14),
    right: new Temporal.PlainMonthDay(4, 14),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `MonthCode` }],
        left: `M03`,
        right: `M04`,
      },
    ],
  },
  {
    name: `non-equal PlainMonthDay day`,
    left: new Temporal.PlainMonthDay(3, 14),
    right: new Temporal.PlainMonthDay(3, 15),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Day` }],
        left: 14,
        right: 15,
      },
    ],
  },
  {
    name: `non-equal PlainMonthDays`,
    left: new Temporal.PlainMonthDay(3, 14, `iso8601`),
    right: new Temporal.PlainMonthDay(4, 15, `gregory`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `MonthCode` }],
        left: `M03`,
        right: `M04`,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Day` }],
        left: 14,
        right: 15,
      },
    ],
  },

  // Temporal.PlainTime
  {
    name: `equal PlainTimes`,
    left: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    diffs: [],
  },
  {
    name: `non-equal PlainTime hour`,
    left: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainTime(11, 30, 0, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Hour` }],
        left: 10,
        right: 11,
      },
    ],
  },
  {
    name: `non-equal PlainTime minute`,
    left: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainTime(10, 31, 0, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Minute` }],
        left: 30,
        right: 31,
      },
    ],
  },
  {
    name: `non-equal PlainTime second`,
    left: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainTime(10, 30, 1, 0, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Second` }],
        left: 0,
        right: 1,
      },
    ],
  },
  {
    name: `non-equal PlainTime millisecond`,
    left: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainTime(10, 30, 0, 1, 0, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Millisecond` }],
        left: 0,
        right: 1,
      },
    ],
  },
  {
    name: `non-equal PlainTime microsecond`,
    left: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainTime(10, 30, 0, 0, 1, 0),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Microsecond` }],
        left: 0,
        right: 1,
      },
    ],
  },
  {
    name: `non-equal PlainTime nanosecond`,
    left: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainTime(10, 30, 0, 0, 0, 1),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Nanosecond` }],
        left: 0,
        right: 1,
      },
    ],
  },
  {
    name: `non-equal PlainTimes`,
    left: new Temporal.PlainTime(10, 30, 0, 0, 0, 0),
    right: new Temporal.PlainTime(11, 31, 1, 1, 1, 1),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Hour` }],
        left: 10,
        right: 11,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Minute` }],
        left: 30,
        right: 31,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Second` }],
        left: 0,
        right: 1,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Millisecond` }],
        left: 0,
        right: 1,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Microsecond` }],
        left: 0,
        right: 1,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Nanosecond` }],
        left: 0,
        right: 1,
      },
    ],
  },

  // Temporal.PlainYearMonth
  {
    name: `equal PlainYearMonths`,
    left: new Temporal.PlainYearMonth(2024, 3),
    right: new Temporal.PlainYearMonth(2024, 3),
    diffs: [],
  },
  {
    name: `non-equal PlainYearMonth calendar`,
    left: new Temporal.PlainYearMonth(2024, 3, `iso8601`),
    right: new Temporal.PlainYearMonth(2024, 3, `gregory`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
    ],
  },
  {
    name: `non-equal PlainYearMonth year`,
    left: new Temporal.PlainYearMonth(2024, 3),
    right: new Temporal.PlainYearMonth(2025, 3),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Year` }],
        left: 2024,
        right: 2025,
      },
    ],
  },
  {
    name: `non-equal PlainYearMonth month`,
    left: new Temporal.PlainYearMonth(2024, 3),
    right: new Temporal.PlainYearMonth(2024, 4),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Month` }],
        left: 3,
        right: 4,
      },
    ],
  },
  {
    name: `non-equal PlainYearMonths`,
    left: new Temporal.PlainYearMonth(2024, 3, `iso8601`),
    right: new Temporal.PlainYearMonth(2025, 4, `gregory`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Year` }],
        left: 2024,
        right: 2025,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Month` }],
        left: 3,
        right: 4,
      },
    ],
  },

  // Temporal.ZonedDateTime
  {
    name: `equal ZonedDateTimes`,
    left: new Temporal.ZonedDateTime(0n, `UTC`),
    right: new Temporal.ZonedDateTime(0n, `UTC`),
    diffs: [],
  },
  {
    name: `non-equal ZonedDateTime calendar`,
    left: new Temporal.ZonedDateTime(0n, `UTC`, `iso8601`),
    right: new Temporal.ZonedDateTime(0n, `UTC`, `gregory`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
    ],
  },
  {
    name: `non-equal ZonedDateTime time zone`,
    left: new Temporal.ZonedDateTime(0n, `UTC`),
    right: new Temporal.ZonedDateTime(0n, `America/New_York`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `TimeZone` }],
        left: `UTC`,
        right: `America/New_York`,
      },
    ],
  },
  {
    name: `non-equal ZonedDateTime epochNanoseconds`,
    left: new Temporal.ZonedDateTime(0n, `UTC`),
    right: new Temporal.ZonedDateTime(1_000_000n, `UTC`),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `EpochNanoseconds` }],
        left: 0n,
        right: 1_000_000n,
      },
    ],
  },
  {
    name: `non-equal ZonedDateTimes`,
    left: new Temporal.ZonedDateTime(0n, `UTC`, `iso8601`),
    right: new Temporal.ZonedDateTime(
      1_000_000n,
      `America/New_York`,
      `gregory`,
    ),
    diffs: [
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `Calendar` }],
        left: `iso8601`,
        right: `gregory`,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `TimeZone` }],
        left: `UTC`,
        right: `America/New_York`,
      },
      {
        kind: `value`,
        path: [{ kind: `internal-slot`, slot: `EpochNanoseconds` }],
        left: 0n,
        right: 1_000_000n,
      },
    ],
  },
]

test.each(cases)(`$name`, ({ left, right, diffs }) => {
  const actualDiffs = [...strictDiff(left, right)]

  expect(actualDiffs).toStrictEqual(diffs)
})

const primitiveArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.boolean(),
  fc.double(),
  fc.bigInt(),
  fc.string(),
)

test.prop([fc.anything()])(
  `strictDiff(value, value) is always empty`,
  value => {
    const diffs = [...strictDiff(value, value)]

    expect(diffs).toStrictEqual([])
  },
)

test.prop([fc.clone(fc.anything(), 2)])(
  `strictDiff(value, clone(value)) is always empty`,
  ([left, right]) => {
    const diffs = [...strictDiff(left, right)]

    expect(diffs).toStrictEqual([])
  },
)

test.prop([fc.anything(), fc.anything()])(
  `strictDiff is robust to path mutations while iterating`,
  (left, right) => {
    const nonMutatedDiffs: Diff[] = []
    for (const diff of strictDiff(left, right)) {
      nonMutatedDiffs.push(structuredClone(diff))
      diff.path.push({ kind: `internal-slot`, slot: `BOOM!` })
    }

    const diffs = [...strictDiff(left, right)]
    expect(nonMutatedDiffs).toStrictEqual(diffs)
  },
)

test.prop([fc.uniqueArray(primitiveArb, { minLength: 2, maxLength: 2 })])(
  `different primitives produce exactly one root-level diff`,
  ([left, right]) => {
    const diffs = [...strictDiff(left, right)]

    expect(diffs).toMatchObject([
      {
        kind: expect.toBeOneOf([`type`, `value`]) as string,
        path: [],
      },
    ])
  },
)

test.prop([fc.anything(), fc.anything()])(
  `strictDiff does not mutate its inputs`,
  (left, right) => {
    const leftClone = structuredClone(left)
    const rightClone = structuredClone(right)

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    ;[...strictDiff(left, right)]

    expect(left).toStrictEqual(leftClone)
    expect(right).toStrictEqual(rightClone)
  },
)

test.prop([fc.clone(fc.anything(), 2)])(
  `swapping inputs swaps left and right in all diffs`,
  ([left, right]) => {
    const diffs = [...strictDiff(left, right)]
    const flippedDiffs = [...strictDiff(right, left)]

    expect(diffs).toStrictEqual(flippedDiffs.map(flipDiff))
  },
)

const flipDiff = (diff: Diff): Diff => {
  switch (diff.kind) {
    case `type`:
      return { ...diff, left: diff.right, right: diff.left }
    case `key`:
      return { ...diff, left: diff.right, right: diff.left }
    case `value`:
      return { ...diff, left: diff.right, right: diff.left }
    case `reference`:
      return {
        ...diff,
        leftFirstSeenPath: diff.rightFirstSeenPath,
        rightFirstSeenPath: diff.leftFirstSeenPath,
      }
  }
}
