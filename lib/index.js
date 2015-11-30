'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (Adapter) {
  function RedisAdapter(properties) {
    Adapter.call(this, properties);
  }

  RedisAdapter.prototype = Object.create(Adapter.prototype);

  RedisAdapter.prototype.connect = function () {
    this.db = _redis2.default.configureFactory(this.options, this).createClient();
    this.transformers = utils.createTransformers(this, this.recordTypes);
    return Promise.resolve();
  };

  RedisAdapter.prototype.disconnect = function () {
    return this.db.quit();
  };

  RedisAdapter.prototype.find = function (type, ids, options) {
    var _this = this;

    if (ids && !ids.length) {
      return Adapter.prototype.find.call(this);
    }

    var recordTypes = this.recordTypes;

    var fields = recordTypes[type];
    var transformer = this.transformers[type];

    var findRecords = function findRecords(collectionIds) {
      var getRecord = function getRecord(id) {
        return _this.db.get(type + ':' + id).then(function (record) {
          return JSON.parse(record);
        });
      };

      var fc = collectionIds.map(getRecord);

      return Promise.all(fc).then(function (records) {
        return records.filter(utils.compact);
      }).then(function (records) {
        return records.map(transformer);
      }).then(function (records) {
        return records.map(function (record) {
          return _helpers.outputRecord.call(_this, type, record);
        });
      }).then(function (records) {
        return (0, _common.applyOptions)(records.length, fields, records, options);
      });
    };

    return ids ? findRecords(ids) : this.db.smembers(type).then(findRecords);
  };

  RedisAdapter.prototype.create = function (type, recordsArg) {
    var _this2 = this;

    var primaryKey = this.keys.primary;
    var ConflictError = this.errors.ConflictError;

    var saveInRedis = function saveInRedis(records) {
      var fc = records.map(function (record) {
        var id = record[primaryKey];
        return _this2.db.multi().sadd('' + type, id).set(type + ':' + id, JSON.stringify(record)).exec().then(function () {
          return record;
        });
      });

      return Promise.all(fc);
    };

    var inputRecords = recordsArg.map(_helpers.inputRecord.bind(this, type));

    var duplicates = function duplicates() {
      var checkCount = function checkCount(count) {
        if (count > 0) return Promise.reject(new ConflictError('Record already exists.'));
      };

      var findDuplicate = function findDuplicate(record) {
        return _this2.db.sismember(type, record.id).then(checkCount);
      };

      return Promise.all(inputRecords.filter(function (record) {
        return utils.compact(record.id);
      }).map(findDuplicate));
    };

    return duplicates().then(function () {
      return saveInRedis(inputRecords);
    });
  };

  RedisAdapter.prototype.update = function (type, updatesArg) {
    var _this3 = this;

    if (!updatesArg.length) {
      return Adapter.prototype.update.call(this);
    }

    var NotFoundError = this.errors.NotFoundError;

    var decodeRecord = function decodeRecord(recordEncoded) {
      return _this3.transformers[type](JSON.parse(recordEncoded));
    };

    var updateRecord = function updateRecord(updateRequest) {
      var id = updateRequest.id;

      var checkCount = function checkCount(count) {
        if (count === 0) return Promise.reject(new NotFoundError('Record not set.'));
      };

      var applyUpdateOnRecord = function applyUpdateOnRecord(record) {
        (0, _apply_update2.default)(record, updateRequest);
        return record;
      };

      return _this3.db.sismember(type, id).then(checkCount).then(function () {
        return _this3.db.get(type + ':' + id);
      }).then(decodeRecord).then(applyUpdateOnRecord).then(function (record) {
        return _this3.db.set(type + ':' + id, JSON.stringify(record));
      }).catch(function () {
        return undefined;
      });
    };

    var updateInRedis = function updateInRedis(updates) {
      var fc = updates.filter(function (updateRequest) {
        return utils.compact(updateRequest.id);
      }).map(updateRecord);

      return Promise.all(fc).then(function (updated) {
        return updated.filter(utils.compact);
      });
    };

    return updateInRedis(updatesArg).then(function (records) {
      return records.length;
    });
  };

  RedisAdapter.prototype.delete = function (type, ids) {
    var _this4 = this;

    if (ids && !ids.length) {
      return Adapter.prototype.delete.call(this);
    }
    var deleteInRedis = function deleteInRedis(collectionIds) {
      var fc = collectionIds.map(function (id) {
        return _this4.db.multi().srem('' + type, id).del(type + ':' + id).exec().then(function (res) {
          return res[0] === 1 ? id : undefined;
        });
      });
      return Promise.all(fc).then(function (deletedIds) {
        return deletedIds.filter(utils.compact);
      });
    };

    var idsToDelete = ids ? Promise.resolve(ids) : this.db.smembers(type);

    return idsToDelete.then(deleteInRedis).then(function (records) {
      return records.length;
    });
  };

  return RedisAdapter;
};

var _redis = require('./redis');

var _redis2 = _interopRequireDefault(_redis);

var _helpers = require('fortune/lib/adapter/adapters/memory/helpers');

var _common = require('fortune/lib/adapter/adapters/common');

var _apply_update = require('fortune/lib/common/apply_update');

var _apply_update2 = _interopRequireDefault(_apply_update);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }