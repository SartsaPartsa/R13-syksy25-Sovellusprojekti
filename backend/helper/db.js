// Postgres pool helper
// uses env vars, switches DB for tests

import pkg from 'pg'
import dotenv from 'dotenv'

// runtime environment, defaults to development
const environment = process.env.NODE_ENV || 'development'
dotenv.config() // load variables from .env

const port = process.env.port
const { Pool } = pkg

// build pool from env
const openDb = () => {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: environment === 'development'
      ? process.env.DB_NAME
      : process.env.TEST_DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  })
  return pool
}

// shared pool
const pool = openDb()
export { pool }