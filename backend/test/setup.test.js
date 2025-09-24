import { resetTestDb } from '../helper/test.js'

// Global test setup for Mocha
// Clears test database before running the test suite to ensure a clean state
before(async function () {
  // Increase timeout in case DB is slow on CI
  this.timeout(10000)
  await resetTestDb()
})
