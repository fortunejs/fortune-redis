import testAdapter from 'fortune/test/adapter'
import adapter from '../../src'

testAdapter(adapter, {
  generateId() {
    return Math.floor(Math.random() * Math.pow(2, 32)).toString(16)
  },
})
