import builtinType from 'builtin-type'
import type { BuiltinType } from 'builtin-type'

/**
 * A path segment representing an object's own property.
 *
 * The path segment points to the property's {@link PropertyDescriptor}. Another
 * path segment must be used to target the descriptor's `[[Value]]` slot.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Enumerability_and_ownership_of_properties
 */
export type PropertyPathSegment = {
  kind: `property`

  /** The property's index in the array returned by {@link Reflect.ownKeys}. */
  index: number

  /**
   * The property's key.
   *
   * Valid numeric indices are provided as numbers.
   */
  key: number | string | symbol
}

/**
 * A path segment representing an object's internal slot.
 *
 * @see https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-object-internal-methods-and-internal-slots
 */
export type InternalSlotPathSegment = {
  kind: `internal-slot`

  /**
   * The name of the slot.
   *
   * For ECMAScript defined types, this will be the name of the internal slot
   * excluding the `[[...]]` delimiters.
   *
   * For WHATWG defined types, this will be the name of the IDL attribute.
   *
   * @see https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-object-internal-methods-and-internal-slots
   * @see https://webidl.spec.whatwg.org/#idl-attributes
   */
  slot: string
}

export type PathSegment = PropertyPathSegment | InternalSlotPathSegment

/**
 * The path from a root value to some subvalue within it.
 *
 * An empty path points to the root value.
 */
export type Path = PathSegment[]

/** A diff between the builtin types of left and right values. */
export type TypeDiff = {
  kind: `type`

  /**
   * The path from the left and right root values to where they have a type
   * diff.
   */
  path: Path

  /** The left value's type at {@link TypeDiff.path}. */
  left: BuiltinType

  /** The left value's type at {@link TypeDiff.path}. */
  right: BuiltinType
}

/** A diff between the keys of left and right objects. */
export type KeyDiff = {
  kind: `key`

  /**
   * The path from the left and right root values to the left and right
   * subobjects where they have a key diff at {@link KeyDiff.index}.
   */
  path: Path

  /**
   * The index in the array returned by {@link Reflect.ownKeys} where the diff
   * is.
   */
  index: number

  /** The left key at {@link KeyDiff.path}. */
  left: PropertyKey | undefined

  /** The right key at {@link KeyDiff.path}. */
  right: PropertyKey | undefined
}

/** A diff between left and right values of the same type. */
export type ValueDiff = {
  kind: `value`

  /** The path from the two root values to where they have a value diff. */
  path: Path

  /** The left value at {@link ValueDiff.path}. */
  left: unknown

  /** The right value at {@link ValueDiff.path}. */
  right: unknown
}

export type ReferenceDiff = {
  kind: `reference`

  /** The path from the two root values to where they have a reference diff. */
  path: Path

  /**
   * The path from the left root value to where the left value was first seen.
   */
  leftFirstSeenPath: Path | undefined

  /**
   * The path from the right root value to where the right value was first seen.
   */
  rightFirstSeenPath: Path | undefined
}

export type Diff = TypeDiff | KeyDiff | ValueDiff | ReferenceDiff

const strictDiff = (value1: unknown, value2: unknown): Iterable<Diff> => ({
  [Symbol.iterator]: () => enumerateDiffs(value1, value2, [], makeState()),
})

type State = {
  _leftFirstSeenPaths: Map<object, Path>
  _rightFirstSeenPaths: Map<object, Path>
}

const makeState = (): State => ({
  _leftFirstSeenPaths: new Map(),
  _rightFirstSeenPaths: new Map(),
})

function* enumerateDiffs(
  left: unknown,
  right: unknown,
  path: Path,
  state: State,
): IterableIterator<Diff> {
  if (Object.is(left, right)) {
    return
  }

  const leftType = builtinType(left)
  const rightType = builtinType(right)
  if (leftType !== rightType) {
    yield { kind: `type`, path: [...path], left: leftType, right: rightType }
    return
  }

  if (!isObject(left) || !isObject(right)) {
    yield { kind: `value`, path: [...path], left, right }
    return
  }

  const leftFirstSeenPath = state._leftFirstSeenPaths.get(left)
  const rightFirstSeenPath = state._rightFirstSeenPaths.get(right)
  if (leftFirstSeenPath || rightFirstSeenPath) {
    if (!pathsEqual(leftFirstSeenPath, rightFirstSeenPath)) {
      yield {
        kind: `reference`,
        path: [...path],
        leftFirstSeenPath,
        rightFirstSeenPath,
      }
    }
    return
  }
  state._leftFirstSeenPaths.set(left, path)
  state._rightFirstSeenPaths.set(right, path)

  yield* enumerateInternalSlotDiffs(leftType, left, right, path, state)
  yield* enumerateOwnPropertyDiffs(left, right, path, state)
}

const pathsEqual = (
  path1: Path | undefined,
  path2: Path | undefined,
): boolean => {
  if (path1 === path2) {
    return true
  }
  if (!path1 || !path2) {
    return false
  }
  if (path1.length !== path2.length) {
    return false
  }
  return path1.every((segment, index) =>
    pathSegmentsEqual(segment, path2[index]!),
  )
}

const pathSegmentsEqual = (
  segment1: PathSegment,
  segment2: PathSegment,
): boolean => {
  if (segment1.kind !== segment2.kind) {
    return false
  }

  switch (segment1.kind) {
    case `property`: {
      const propertySegment2 = segment2 as PropertyPathSegment
      return (
        segment1.index === propertySegment2.index &&
        segment1.key === propertySegment2.key
      )
    }
    case `internal-slot`:
      return segment1.slot === (segment2 as InternalSlotPathSegment).slot
  }
}

function* enumerateInternalSlotDiffs(
  type: BuiltinType,
  left: object,
  right: object,
  path: Path,
  state: State,
): Generator<Diff> {
  const leftSlots = getInternalSlots(type, left)
  const rightSlots = getInternalSlots(type, right)

  const slots = new Set([...Object.keys(leftSlots), ...Object.keys(rightSlots)])
  for (const slot of slots) {
    yield* enumerateDiffs(
      leftSlots[slot],
      rightSlots[slot],
      [...path, { kind: `internal-slot`, slot }],
      state,
    )
  }
}

const getInternalSlots = (
  type: BuiltinType,
  value: object,
): Record<string, unknown> => {
  const slots: Record<string, unknown> = {
    Prototype: Object.getPrototypeOf(value),
    Extensible: Object.isExtensible(value),
  }

  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (type) {
    case `Boolean`:
    case `Number`:
    case `BigInt`:
    case `String`:
    case `Symbol`: {
      // https://tc39.es/ecma262/#sec-thisbooleanvalue
      // https://tc39.es/ecma262/#sec-thisnumbervalue
      // https://tc39.es/ecma262/#sec-thisbigintvalue
      // https://tc39.es/ecma262/#sec-thisstringvalue
      // https://tc39.es/ecma262/#sec-thissymbolvalue
      const valueOf: (this: object) => unknown =
        globalThis[type].prototype.valueOf
      slots[`${type}Data`] = valueOf.call(value)
      break
    }
    case `Map`:
      // https://tc39.es/ecma262/#sec-createmapiterator
      slots.MapData = [...Map.prototype.entries.call(value)]
      break
    case `Set`:
      // https://tc39.es/ecma262/#sec-createsetiterator
      slots.SetData = [...Set.prototype.values.call(value)]
      break
    case `Function`:
    case `GeneratorFunction`:
    case `AsyncFunction`:
    case `AsyncGeneratorFunction`:
      break
    case `Promise`:
      break
    case `Date`:
      // https://tc39.es/ecma262/#sec-date.prototype.gettime
      slots.DateValue = Date.prototype.getTime.call(value as Date)
      break
    case `RegExp`:
      // https://tc39.es/ecma262/#sec-get-regexp.prototype.source
      slots.OriginalSource = accessGetter(RegExp, `source`, value)
      // https://tc39.es/ecma262/#sec-get-regexp.prototype.flags
      slots.OriginalFlags = accessGetter(RegExp, `flags`, value)
      break
    case `URL`:
      // https://url.spec.whatwg.org/#url-class
      slots.href = accessGetter(URL, `href`, value)
      break
    case `URLSearchParams`:
      // https://url.spec.whatwg.org/#urlsearchparams
      slots.list = URLSearchParams.prototype.toString.call(value)
      break
    case `WeakRef`:
      // https://tc39.es/ecma262/#sec-weak-ref.prototype.deref
      slots.WeakRefTarget = WeakRef.prototype.deref.call(value)
      break
    case `ArrayBuffer`:
      if (accessGetter(ArrayBuffer, `detached`, value)) {
        slots.ArrayBufferData = null
        break
      }
    // Falls through on purpose.
    // eslint-disable-next-line no-fallthrough
    case `SharedArrayBuffer`: {
      const Class = globalThis[type]
      slots.ArrayBufferByteLength = accessGetter(Class, `byteLength`, value)
      slots.ArrayBufferMaxByteLength = accessGetter(
        Class,
        `maxByteLength`,
        value,
      )
      slots.ArrayBufferData = [
        ...new Uint8Array(value as ArrayBuffer | SharedArrayBuffer),
      ]
      break
    }
    case `Buffer`:
    case `Int8Array`:
    case `Uint8Array`:
    case `Uint8ClampedArray`:
    case `Int16Array`:
    case `Uint16Array`:
    case `Int32Array`:
    case `Uint32Array`:
    case `BigInt64Array`:
    case `BigUint64Array`:
    case `Float16Array`:
    case `Float32Array`:
    case `Float64Array`:
    case `DataView`: {
      const Class = globalThis[type]
      slots.ByteOffset = accessGetter(Class, `byteOffset`, value)
      slots.ByteLength = accessGetter(Class, `byteLength`, value)
      slots.ViewedArrayBuffer = accessGetter(Class, `buffer`, value)
      break
    }
    case `Temporal.Duration`:
    case `Temporal.Instant`:
    case `Temporal.PlainDate`:
    case `Temporal.PlainDateTime`:
    case `Temporal.PlainMonthDay`:
    case `Temporal.PlainTime`:
    case `Temporal.PlainYearMonth`:
    case `Temporal.ZonedDateTime`:
      break
  }

  return slots
}

const accessGetter = (
  cls: { prototype: unknown },
  key: string,
  value: object,
): unknown => {
  for (
    let prototype: unknown = cls.prototype;
    prototype;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, key)
    if (descriptor) {
      return descriptor.get!.call(value)
    }
  }
  throw new Error(`No getter found for ${key}`)
}

const isObject = (value: unknown): value is object => {
  const type = typeof value
  return (type === `object` && !!value) || type === `function`
}

function* enumerateOwnPropertyDiffs(
  left: object,
  right: object,
  path: Path,
  state: State,
): Generator<Diff> {
  const leftKeys = Reflect.ownKeys(left)
  const rightKeys = Reflect.ownKeys(right)

  const keyCount = Math.max(leftKeys.length, rightKeys.length)
  for (let index = 0; index < keyCount; index++) {
    const leftKey = maybeConvertToIndex(leftKeys[index])
    const rightKey = maybeConvertToIndex(rightKeys[index])

    if (leftKey !== rightKey) {
      yield {
        kind: `key`,
        path: [...path],
        index,
        left: leftKey,
        right: rightKey,
      }
      continue
    }

    const key = leftKey!
    const leftDescriptor = Object.getOwnPropertyDescriptor(left, key)!
    const rightDescriptor = Object.getOwnPropertyDescriptor(right, key)!
    for (const descriptorKey of PROPERTY_DESCRIPTOR_KEYS) {
      yield* enumerateDiffs(
        leftDescriptor[descriptorKey],
        rightDescriptor[descriptorKey],
        [
          ...path,
          { kind: `property`, index, key },
          {
            kind: `internal-slot` as const,
            slot: descriptorKey[0]!.toUpperCase() + descriptorKey.slice(1),
          },
        ],
        state,
      )
    }
  }
}

const maybeConvertToIndex = (
  key: PropertyKey | undefined,
): PropertyKey | undefined => {
  if (key === undefined) {
    return undefined
  }

  if (typeof key !== `string`) {
    return key
  }

  const index = Number(key)
  if (
    Number.isInteger(index) &&
    index >= 0 &&
    index <= 2 ** 32 - 2 &&
    String(index) === key
  ) {
    return index
  }

  return key
}

const PROPERTY_DESCRIPTOR_KEYS = [
  `configurable`,
  `enumerable`,
  `writable`,
  `value`,
  `get`,
  `set`,
] as const

export default strictDiff
