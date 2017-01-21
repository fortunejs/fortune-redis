/* eslint func-names: 0 */
import configureFactory from './redis'
import { inputRecord, outputRecord, generateId } from './helpers'
import { applyOptions } from 'fortune/lib/adapter/adapters/common.js'
import applyUpdate from 'fortune/lib/common/apply_update'

const adapterOptions = new Set(['generateId'])
const concatRedisResult = (i) => (results) => [].concat(...results.map((r) => r[i]))
const concatReplies = concatRedisResult(1)

const features = {
  logicalOperators: true,
};
/**
 * Redis Adapter
 * @param AdapterBase
 * @return {RedisAdapter}
 */
export default (Adapter) => class RedisAdapter extends Adapter {
  constructor(...args) {
    super(...args)
    if (!this.options) {
      this.options = {}
    }

    if (!('recordsPerType' in this.options)) {
      this.options.recordsPerType = 1000
    }

    if (!('separator' in this.options)) {
      this.options.separator = ':'
    }

    if (!('generateId' in this.options)) {
      this.options.generateId = generateId
    }

    this.keys.separator = this.options.separator
    Object.assign(this, { features });
  }

  connect() {
    let {options} = this

    options = options || {}

    const parameters = {}

    for (const key in options) {
      if (!adapterOptions.has(key)) {
        parameters[key] = options[key]
      }
    }

    this.redis = configureFactory(parameters).createClient()
    return this.Promise.resolve()
  }

  disconnect() {
    return this.redis.quit()
  }

  create(type, records) {
    if (!records.length) {
      return super.create()
    }
    const {redis} = this
    const primaryKey = this.keys.primary
    const separator = this.keys.separator
    const recordsInput = records.map(inputRecord.bind(this, type))
    const pipeline = redis.pipeline()
    const {ConflictError} = this.errors

    recordsInput.forEach((rec) => pipeline.sismember(type, rec[primaryKey]))

    return pipeline.exec()
      .then(concatReplies)
      .then((replies) => {
        if (!replies.every((repl) => repl === 0)) {
          return this.Promise.reject(new ConflictError('duplicate key'))
        }
      })
      .then(() => {
        const mlt = redis.multi()
        recordsInput.forEach((rec) => {
          mlt.sadd(type, rec[primaryKey])
          mlt.set(`${type}${separator}${rec[primaryKey]}`, JSON.stringify(rec))
        })
        return mlt.exec()
      })
      .then(() => recordsInput)
  }

  find(type, ids, options = {}, meta = {}) {
    if (ids && !ids.length) {
      return super.find()
    }

    const {redis, recordTypes, keys} = this
    const separator = keys.separator

    if (!ids) {
      return redis.smembers(type)
        .then((collectionId) => this.find(type, collectionId, options))
    }

    return redis.mget(ids.map((id) => `${type}${separator}${id}`))
      .then((replies) => replies.filter((repl) => repl !== null))
      .then((entries) => {
        const fn = outputRecord.bind(this, type)
        return entries.map((entry) => fn(JSON.parse(entry)))
      })
      .then((entries) => {
        return applyOptions(recordTypes[type], entries, options, meta)
      })
  }

  update(type, updates) {
    if (!updates.length) {
      return super.update()
    }

    const {Promise, redis, keys} = this
    const primaryKey = keys.primary
    const separator = keys.separator

    const updateIds = updates.map((uIds) => uIds[primaryKey])

    const concatIds = (replies) => {
      return concatReplies(replies)
        .reduce((agg, repl, index) => {
          if (repl === 1) {
            agg.push(updates[index])
          }
          return agg
        }, [])
    }

    return Promise.resolve(updateIds)
      .then((ids) => {
        const pipeline = redis.pipeline()
        ids.forEach((id) => pipeline.sismember(type, id))
        return pipeline.exec()
      })
      .then(concatIds)
      .then((validUpdates) => {
        if (updates.length <= 0) {
          return validUpdates
        }
        const multi = redis.multi()
        const ids = validUpdates.map((update) => update[primaryKey])

        return this.find(type, ids)
          .then((records) => {
            records.forEach((record, index) => {
              const id = record[primaryKey]
              applyUpdate(record, validUpdates[index])
              multi.set(`${type}${separator}${id}`, JSON.stringify(record))
            })
            return multi.exec()
          })
      })
      .then(concatReplies)
      .then((replies) => replies.length)
  }

  delete(type, ids) {
    if (ids && !ids.length) {
      return super.delete()
    }

    const {redis, keys} = this
    const separator = keys.separator

    const getIdsToDelete = () => {
      return ids && ids.length ? Promise.resolve(ids) : redis.smembers(type)
    }

    return getIdsToDelete()
      .then((idsFound) => {
        if (idsFound.length === 0) {
          return idsFound
        }
        const multi = redis.multi()
        idsFound.forEach((id) => {
          multi.srem(type, id)
          multi.del(`${type}${separator}${id}`)
        })
        return multi.exec()
      })
      .then(concatReplies)
      .then((res) => {
        return res.reduce((counter, added) => counter + added, 0) / 2
      })
  }
}
