import { expect } from 'chai'
import { uniqueEmail, signup } from '../helper/test.js'

describe('Auth – signup', () => {
  // Should create a new user
  it('creates a user', async () => {
    const email = uniqueEmail('signup')
    const password = 'Test1234'
    const { res, data } = await signup({ email, password })
    expect(res.status).to.equal(201)
    expect(data).to.include.keys(['id', 'email'])
    expect(data.email).to.equal(email)
  })

  // Missing fields should fail
  it('fails without email/password', async () => {
    const { res } = await signup({ email: undefined, password: undefined })
    expect(res.status).to.equal(400)
  })

  // Bad email format should fail
  it('fails with invalid email format', async () => {
    const { res } = await signup({ email: 'not-an-email', password: 'Test1234' })
    expect(res.status).to.equal(400)
  })

  // Weak password should fail
  it('fails with weak password (no uppercase or number)', async () => {
    const email = uniqueEmail('weakpwd')
    const { res } = await signup({ email, password: 'password' })
    expect(res.status).to.equal(400)
  })

  it('fails when email already exists (duplicate signup)', async () => {
    const email = uniqueEmail('dup')
    const password = 'Test1234'
    const first = await signup({ email, password })
    expect(first.res.status).to.equal(201)
    const second = await signup({ email, password })
    // Error handler maps PG unique violation (23505) to 409
    expect(second.res.status).to.equal(409)
  })
})
