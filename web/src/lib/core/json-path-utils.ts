/**
 * Utilities for working with JSON paths and nested object manipulation
 */

/**
 * Get a value at a specific path in an object
 * Path format: "field" or "field.nested" or "array[0]" or "field.array[0].nested"
 */
export function getValueAtPath(obj: any, path: string): any {
  if (!path) return obj;

  const parts = parsePath(path);
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (part.type === 'property') {
      current = current[part.key];
    } else if (part.type === 'index') {
      current = current[part.index];
    }
  }

  return current;
}

/**
 * Set a value at a specific path in an object (immutable - returns new object)
 */
export function setValueAtPath(obj: any, path: string, value: any): any {
  if (!path) return value;

  const parts = parsePath(path);
  return setValueAtPathRecursive(obj, parts, 0, value);
}

function setValueAtPathRecursive(obj: any, parts: PathPart[], index: number, value: any): any {
  if (index === parts.length) return value;

  const part = parts[index];
  const isLast = index === parts.length - 1;

  if (part.type === 'property') {
    const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
    newObj[part.key] = isLast ? value : setValueAtPathRecursive(obj[part.key] || {}, parts, index + 1, value);
    return newObj;
  } else if (part.type === 'index') {
    const newArray = [...(obj || [])];
    newArray[part.index] = isLast ? value : setValueAtPathRecursive(obj[part.index] || {}, parts, index + 1, value);
    return newArray;
  }

  return obj;
}

/**
 * Delete a value at a specific path (immutable - returns new object)
 */
export function deleteAtPath(obj: any, path: string): any {
  if (!path) return obj;

  const parts = parsePath(path);
  if (parts.length === 0) return obj;

  return deleteAtPathRecursive(obj, parts, 0);
}

function deleteAtPathRecursive(obj: any, parts: PathPart[], index: number): any {
  if (index === parts.length) return obj;

  const part = parts[index];
  const isLast = index === parts.length - 1;

  if (part.type === 'property') {
    if (isLast) {
      const { [part.key]: _removed, ...rest } = obj;
      return rest;
    } else {
      const newObj = { ...obj };
      newObj[part.key] = deleteAtPathRecursive(obj[part.key], parts, index + 1);
      return newObj;
    }
  } else if (part.type === 'index') {
    if (isLast) {
      return obj.filter((_: any, i: number) => i !== part.index);
    } else {
      const newArray = [...obj];
      newArray[part.index] = deleteAtPathRecursive(obj[part.index], parts, index + 1);
      return newArray;
    }
  }

  return obj;
}

/**
 * Move an array item from one index to another (immutable - returns new object)
 */
export function moveArrayItem(obj: any, arrayPath: string, fromIndex: number, toIndex: number): any {
  const array = getValueAtPath(obj, arrayPath);
  if (!Array.isArray(array)) return obj;

  const newArray = [...array];
  const [item] = newArray.splice(fromIndex, 1);
  newArray.splice(toIndex, 0, item);

  return setValueAtPath(obj, arrayPath, newArray);
}

/**
 * Append an item to an array at a path (immutable - returns new object)
 */
export function appendToArray(obj: any, arrayPath: string, item: any): any {
  const array = getValueAtPath(obj, arrayPath);
  const newArray = Array.isArray(array) ? [...array, item] : [item];
  return setValueAtPath(obj, arrayPath, newArray);
}

/**
 * Remove an item from an array at a specific index (immutable - returns new object)
 */
export function removeFromArray(obj: any, arrayPath: string, index: number): any {
  const array = getValueAtPath(obj, arrayPath);
  if (!Array.isArray(array)) return obj;

  const newArray = array.filter((_, i) => i !== index);
  return setValueAtPath(obj, arrayPath, newArray);
}

// Helper types and functions

type PathPart =
  | { type: 'property'; key: string }
  | { type: 'index'; index: number };

function parsePath(path: string): PathPart[] {
  const parts: PathPart[] = [];
  let current = '';
  let inBracket = false;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (char === '[') {
      if (current) {
        parts.push({ type: 'property', key: current });
        current = '';
      }
      inBracket = true;
    } else if (char === ']') {
      if (inBracket && current) {
        parts.push({ type: 'index', index: parseInt(current, 10) });
        current = '';
      }
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        parts.push({ type: 'property', key: current });
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push({ type: 'property', key: current });
  }

  return parts;
}
