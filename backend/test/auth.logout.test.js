import { expect } from 'chai'
import { uniqueEmail, signup, signin, getProfile } from '../helper/test.js'

describe('Auth – logout', () => {
  // Test password and token holder
  const password = 'Test1234'
  let token

  // Create a user and sign in before tests
  before(async () => {
    const email = uniqueEmail('logout')
    const r1 = await signup({ email, password })
    expect(r1.res.status).to.equal(201)
    const r2 = await signin({ email, password })
    expect(r2.res.status).to.equal(200)
    token = r2.token
  })

  // With a token we can access profile
  it('protected route works with token', async () => {
    const { res, data } = await getProfile(token)
    expect(res.status).to.equal(200)
    expect(data).to.include.keys(['id', 'email'])
  })

  // Without a token it should reject
  it('protected route rejects without token (logout state)', async () => {
    const { res } = await getProfile(null)
    expect(res.status).to.equal(401)
  })
})
