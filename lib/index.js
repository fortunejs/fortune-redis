import redis from './redis';
import { inputRecord, outputRecord } from 'fortune/lib/adapter/adapters/memory/helpers';
import { applyOptions } from 'fortune/lib/adapter/adapters/common';
import applyUpdate from 'fortune/lib/common/apply_update';
import * as utils from './utils';

/**
 * Redis adapter
 */
export default function(Adapter) {

  function RedisAdapter(properties) {
    Adapter.call(this, properties);
  }

  RedisAdapter.prototype = Object.create(Adapter.prototype);

  RedisAdapter.prototype.connect = function() {
    this.db = redis.configureFactory(this.options, this).createClient();
    this.transformers = utils.createTransformers(this, this.recordTypes);
    return Promise.resolve();
  };

  RedisAdapter.prototype.disconnect = function() {
    return this.db.quit();
  };

  RedisAdapter.prototype.find = function(type, ids, options) {
    if (ids && !ids.length) {
      return Adapter.prototype.find.call(this);
    }

    const {
      recordTypes,
    } = this;

    const fields = recordTypes[type];
    const transformer = this.transformers[type];

    const findRecords = collectionIds => {
      const getRecord = id => {
        return this.db.get(`${type}:${id}`)
          .then(record => JSON.parse(record));
      };

      const fc = collectionIds.map(getRecord);

      return Promise.all(fc)
        .then(records => records.filter(utils.compact))
        .then(records => records.map(transformer))
        .then(records => records.map(record => outputRecord.call(this, type, record)))
        .then(records => applyOptions(records.length, fields, records, options));
    };

    return ids ?
      findRecords(ids) : this.db.smembers(type).then(findRecords);
  };

  RedisAdapter.prototype.create = function(type, recordsArg) {
    const {
      keys: {
        primary: primaryKey,
      },
      errors: {
        ConflictError,
      },
    } = this;

    const saveInRedis = records => {
      const fc = records.map(record => {
        const id = record[primaryKey];
        return this.db.multi()
          .sadd(`${type}`, id)
          .set(`${type}:${id}`, JSON.stringify(record))
          .exec()
          .then(() => record);
      });

      return Promise.all(fc);
    };

    const inputRecords = recordsArg.map(inputRecord.bind(this, type));

    const duplicates = () => {
      const checkCount = (count) => {
        if (count > 0) return Promise.reject(new ConflictError(`Record already exists.`));
      };

      const findDuplicate = (record) => this.db.sismember(type, record.id)
        .then(checkCount);

      return Promise.all(
        inputRecords.filter(record => utils.compact(record.id))
        .map(findDuplicate)
      );
    };

    return duplicates()
      .then(() => saveInRedis(inputRecords));
  };


  RedisAdapter.prototype.update = function(type, updatesArg) {
    if (!updatesArg.length) {
      return Adapter.prototype.update.call(this);
    }

    const {
      errors: {
        NotFoundError,
      },
    } = this;

    const decodeRecord = (recordEncoded) => this.transformers[type](JSON.parse(recordEncoded));

    const updateRecord = (updateRequest) => {
      const id = updateRequest.id;

      const checkCount = (count) => {
        if (count === 0) return Promise.reject(new NotFoundError(`Record not set.`));
      };

      const applyUpdateOnRecord = (record) => {
        applyUpdate(record, updateRequest);
        return record;
      };

      return this.db.sismember(type, id)
        .then(checkCount)
        .then(() => this.db.get(`${type}:${id}`))
        .then(decodeRecord)
        .then(applyUpdateOnRecord)
        .then(record => this.db.set(`${type}:${id}`, JSON.stringify(record)))
        .catch(() => undefined);
    };

    const updateInRedis = (updates) => {
      const fc = updates
        .filter(updateRequest => utils.compact(updateRequest.id))
        .map(updateRecord);

      return Promise.all(fc)
        .then(updated => updated.filter(utils.compact));
    };

    return updateInRedis(updatesArg)
      .then(records => records.length);
  };

  RedisAdapter.prototype.delete = function(type, ids) {
    if (ids && !ids.length) {
      return Adapter.prototype.delete.call(this);
    }
    const deleteInRedis = collectionIds => {
      const fc = collectionIds.map(id =>
        this.db.multi()
        .srem(`${type}`, id)
        .del(`${type}:${id}`)
        .exec()
        .then(res => res[0] === 1 ? id : undefined)
      );
      return Promise.all(fc).then(deletedIds => deletedIds.filter(utils.compact));
    };

    const idsToDelete = ids ? Promise.resolve(ids) : this.db.smembers(type);

    return idsToDelete
      .then(deleteInRedis)
      .then(records => records.length);
  };

  return RedisAdapter;
}
