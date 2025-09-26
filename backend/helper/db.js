// Postgres pool helper
// uses env vars, switches DB for tests

import pkg from 'pg'
import dotenv from 'dotenv'

// Load .env first, then read env
dotenv.config()
// runtime environment, defaults to development
const environment = process.env.NODE_ENV || 'development'
const isProd = environment === 'production'

const { Pool } = pkg

// build pool from env
const openDb = () => {
  const dbName = environment === 'test' ? process.env.TEST_DB_NAME : process.env.DB_NAME
  const host = process.env.DB_HOST
  const dbPort = process.env.DB_PORT

  // Log which database connection will be used (env, host, port, db name)
  console.log(`[db] env=${environment} -> host=${host}:${dbPort} database=${dbName}`)

  const pool = new Pool({
    user: process.env.DB_USER,
    host,
    // Use test database only when NODE_ENV is 'test'
    database: dbName,
    password: process.env.DB_PASSWORD,
    port: dbPort,
    // Render PostgreSQL requires SSL
    ssl: isProd ? { rejectUnauthorized: false } : false
  })
  return pool
}

// shared pool
const pool = openDb()
export { pool }