export function isFalsy(item) {
  return [undefined, false, {}, null].includes(item);
}

export function compact(item) {
  return !isFalsy(item);
}

const specialTypes = new WeakMap([
  [Buffer, (value) => new Buffer(value.data)],
  [Date, (value) => new Date(value)],
]);

export function createTransformerByType(adapter, fields) {
  const {
    keys: {
      isArray: isArrayKey,
    },
  } = adapter;

  const decoder = Object.keys(fields)
    .reduce((dest, key) => {
      const handler = specialTypes.get(fields[key].type);

      if (!handler) return dest;
      dest[key] = fields[key][isArrayKey] ? (values) => values.map(handler) : handler;
      return dest;
    }, {});

  return (record) => {
    Object.keys(decoder).forEach(key => {
      const handler = decoder[key];
      const recordValue = record[key];

      if (!isFalsy(recordValue)) {
        record[key] = handler(recordValue);
      }
    });

    return record;
  };
}

export function createTransformers(adapter, recordTypes) {
  const transformers = Object.keys(recordTypes).reduce((dest, type) => {
    dest[type] = createTransformerByType(adapter, recordTypes[type]);
    return dest;
  }, {});

  return transformers;
}
