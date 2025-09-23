import { expect } from 'chai'
import fetch from 'node-fetch'

const base = 'http://localhost:3001/api/user'

describe('Auth API', () => {
  const email = `test${Date.now()}@example.com`
  const password = 'Test1234'

  it('signup creates a user', async () => {
    const res = await fetch(`${base}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { email, password } })
    })
    expect(res.status).to.equal(201)
  })

  it('signin returns token', async () => {
    const res = await fetch(`${base}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { email, password } })
    })
    const data = await res.json()
    expect(res.status).to.equal(200)
    expect(data).to.include.keys(['id','email','token'])
  })

  it('signin fails with wrong password', async () => {
    const res = await fetch(`${base}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { email, password: 'Wrong1234' } })
    })
    expect(res.status).to.equal(401)
  })

  it('signup fails without email/password', async () => {
    const res = await fetch(`${base}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: null })
    })
    expect(res.status).to.equal(400)
  })
})
