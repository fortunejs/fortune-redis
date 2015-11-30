"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isFalsy = isFalsy;
exports.compact = compact;
exports.createTransformerByType = createTransformerByType;
exports.createTransformers = createTransformers;
function isFalsy(item) {
  return [undefined, false, {}, null].indexOf(item) !== -1;
}

function compact(item) {
  return !isFalsy(item);
}

/**
*  @params object value
*  value represent JSON.stringify(attr) extract from redis.
*/
var specialTypes = new WeakMap([[Buffer, function (value) {
  return new Buffer(value.data);
}], [Date, function (value) {
  return new Date(value);
}]]);

function createTransformerByType(adapter, fields) {
  var isArrayKey = adapter.keys.isArray;

  var decoder = Object.keys(fields).reduce(function (dest, key) {
    var handler = specialTypes.get(fields[key].type);

    if (!handler) return dest;
    dest[key] = fields[key][isArrayKey] ? function (values) {
      return values.map(handler);
    } : handler;
    return dest;
  }, {});

  return function (record) {
    Object.keys(decoder).forEach(function (key) {
      var handler = decoder[key];
      var recordValue = record[key];

      if (!isFalsy(recordValue)) {
        record[key] = handler(recordValue);
      }
    });

    return record;
  };
}

/*
* Create a function which decode specific type from Redis value
* because format like Date or Buffer can't be just a String.
*/
function createTransformers(adapter, recordTypes) {
  var transformers = Object.keys(recordTypes).reduce(function (dest, type) {
    dest[type] = createTransformerByType(adapter, recordTypes[type]);
    return dest;
  }, {});

  return transformers;
}