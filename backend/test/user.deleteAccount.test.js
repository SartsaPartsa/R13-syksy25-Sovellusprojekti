import { expect } from 'chai'
import { uniqueEmail, signup, signin, deleteAccount } from '../helper/test.js'

describe('User – delete account', () => {
  // Test creds and token
  const password = 'Test1234'
  let email
  let token

  // Create a user and sign in before tests
  before(async () => {
    email = uniqueEmail('del')
    const r1 = await signup({ email, password })
    expect(r1.res.status).to.equal(201)
    const r2 = await signin({ email, password })
    expect(r2.res.status).to.equal(200)
    token = r2.token
  })

  // Delete should succeed for logged-in user
  it('deletes account for the authenticated user', async () => {
    const { res } = await deleteAccount(token)
    // On success returns 204 No Content
    expect(res.status).to.equal(204)
  })

  // After delete, login should fail
  it('sign-in with deleted account fails', async () => {
    const { res } = await (await import('../helper/test.js')).signin({
      email,
      password
    })
    // Should be 404 user not found
    expect(res.status).to.equal(404)
  })

  // Delete without token should be rejected
  it('delete without token is rejected', async () => {
    const { res } = await deleteAccount(null)
    expect(res.status).to.equal(401)
  })
})
