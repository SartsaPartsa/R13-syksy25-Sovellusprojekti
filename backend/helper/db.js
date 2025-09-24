// Postgres pool helper
// uses env vars, switches DB for tests

import pkg from 'pg'
import dotenv from 'dotenv'

// Load .env first, then read env
dotenv.config()
// runtime environment, defaults to development
const environment = process.env.NODE_ENV || 'development'

const port = process.env.port
const { Pool } = pkg

// build pool from env
const openDb = () => {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    // Use test database only when NODE_ENV is 'test'
    database: environment === 'test'
      ? process.env.TEST_DB_NAME
      : process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  })
  return pool
}

// shared pool
const pool = openDb()
export { pool }