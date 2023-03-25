/**
 * Predicate with type guard that can be inserted into a filter() call to remove
 * undefined values from the array.
 *
 * @param value Any value.
 * @returns True if not undefined.
 */
export const notUndefined = <T>(value?: Readonly<T>): value is T =>
  value !== undefined;

/**
 * Predicate with type guard to check if a value is a string array.
 * Empty arrays will also be declared as string arrays.
 *
 * @param value Possible string array.
 * @returns True if not undefined.
 */
export const isStringArray = (
  value: ReadonlyArray<unknown>
): value is string[] => {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string")
  );
};

/**
 * Convert a value to a custom value if undefined.
 *
 * @param value Any value.
 * @param customValue Custom value to be used if value undefined.
 * @returns Custom value if undefined otherwise the value.
 */
export const convertUndefinedToCustomValue = <TValue, TCustomValue>(
  value: OrUndef<TValue>,
  customValue: TCustomValue
): TValue | TCustomValue => (value === undefined ? customValue : value);

/**
 * Type that describes a not undefined but empty object.
 */
export type EMPTY_OBJECT = Record<never, never>;

/** Primitive types that don't need to be readonly since they already are used by value. */
type ImmutablePrimitive =
  | undefined
  | null
  | boolean
  | string
  | number
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Function
  | unknown;

/**
 * Type that makes a parameter readonly if it isn't already a primitive.
 *
 * (Source: https://stackoverflow.com/a/58993872).
 */
export type DeepReadonly<T> = T extends ImmutablePrimitive
  ? T
  : T extends Array<infer U>
  ? DeepReadonlyArray<U>
  : T extends Map<infer K, infer V>
  ? DeepReadonlyMap<K, V>
  : T extends Set<infer M>
  ? DeepReadonlySet<M>
  : DeepReadonlyObject<T>;

export type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;
export type DeepReadonlyMap<K, V> = ReadonlyMap<
  DeepReadonly<K>,
  DeepReadonly<V>
>;
export type DeepReadonlySet<T> = ReadonlySet<DeepReadonly<T>>;
export type DeepReadonlyObject<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};

/**
 * Type that represents the input type or the input type in a promise.
 */
export type OrPromise<TYPE> = TYPE | Promise<TYPE>;

/**
 * Type that represents the input type or the input type as an array.
 */
export type OrArray<TYPE> = TYPE | TYPE[];

/**
 * Type that represents the input type or the input type as an array.
 */
export type OrReadonlyArray<TYPE> = TYPE | ReadonlyArray<TYPE>;

/**
 * Type that represents the input type or undefined.
 */
export type OrUndef<TYPE> = TYPE | undefined;
