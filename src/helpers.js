import crypto from 'crypto'

export const isBuffer = (fieldType) => (fieldType && (fieldType === Buffer || fieldType.prototype.constructor === Buffer))

/**
 * Generate base64 string from 15 bytes of strong randomness (this is 2 less
 * bits of entropy than UUID version 4). It is ideal for the length of the
 * input to be divisible by 3, since base64 expands the binary input by
 * exactly 1 byte for every 3 bytes, and adds padding length of modulus 3.
 *
 * @return {String}
 */
export const generateId = () => {
  return crypto.randomBytes(15).toString('base64')
}

/**
 * Transform an object from JSON.parse to a Buffer
 * @return {Buffer}
 */
export const toBuffer = (object) => {
  if (Buffer.isBuffer(object)) return object
  return Buffer.from(object)
}

// Cast and assign values per field definition.
export function inputRecord(type, record) {
  const { recordTypes, keys, options } = this
  const primaryKey = keys.primary
  const isArrayKey = keys.isArray
  const genId = options.generateId
  const fields = recordTypes[type]
  const id = record[primaryKey]

  return Object.entries(fields).reduce((r, [field, definition]) => {
    if (field === primaryKey) {
      return r
    }

    if (!record[field]) {
      r[field] = definition[isArrayKey] ? [] : null
      return r
    }

    r[field] = record[field]
    return r
  }, {
    [primaryKey]: id ? id : genId(type),
  })
}

export function outputRecord(type, record) {
  const { recordTypes, keys } = this
  const primaryKey = keys.primary
  const isArrayKey = keys.isArray
  const typeKey = this.keys.type
  const fields = recordTypes[type]
  const denormalizedInverseKey = this.keys.denormalizedInverse

  return Object.entries(fields).reduce((r, [field, definition]) => {
    const fieldType = definition[typeKey]

    if (record[field] && isBuffer(fieldType)) {
      if (definition[isArrayKey]) {
        r[field] = record[field].map(toBuffer)
        return r
      }

      r[field] = toBuffer(record[field]) || null
      return r
    }

    if (record[field] && fieldType === Date) {
      r[field] = new Date(record[field])
      return r
    }

    if (record[field] && fieldType === Boolean) {
      r[field] = Boolean(record[field])
      return r
    }

    if (record[field] && fieldType === Number) {
      r[field] = Number(record[field])
      return r
    }

    if (definition[denormalizedInverseKey]) {
      Object.defineProperty(r, field, {
        configurable: true,
        writable: true,
        value: record[field],
      })
      return r
    }

    r[field] = record[field]
    return r
  }, {
    [primaryKey]: record[primaryKey],
  })
}
