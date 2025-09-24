import { expect } from 'chai'
import { uniqueEmail, signup, signin } from '../helper/test.js'

describe('Auth – login', () => {
  // Test password and email holder
  const password = 'Test1234'
  let email

  // Create a fresh user before tests
  before(async () => {
    email = uniqueEmail('login')
    const { res } = await signup({ email, password })
    expect(res.status).to.equal(201)
  })

  // Should return a token for valid login
  it('returns token on valid credentials', async () => {
    const { res, data, token } = await signin({ email, password })
    expect(res.status).to.equal(200)
    expect(data).to.include.keys(['id', 'email', 'token'])
    expect(token).to.be.a('string').and.to.have.length.greaterThan(10)
  })

  // Wrong password should fail
  it('fails with wrong password', async () => {
    const { res } = await signin({ email, password: 'Wrong1234' })
    expect(res.status).to.equal(401)
  })

  // Unknown email should fail
  it('fails for unknown user', async () => {
    const { res } = await signin({ email: uniqueEmail('nouser'), password })
    expect(res.status).to.equal(404)
  })

  // Missing fields should fail
  it('fails when missing email or password', async () => {
    const r1 = await signin({ email, password: undefined })
    const r2 = await signin({ email: undefined, password })
    expect(r1.res.status).to.equal(400)
    expect(r2.res.status).to.equal(400)
  })
})
