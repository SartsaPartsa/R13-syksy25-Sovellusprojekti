// Browse reviews tests
// Checks list response and pagination
import { expect } from 'chai'
import { browseReviews } from '../helper/test.js'

describe('Reviews – browse', () => {
  // Should return a list with meta fields
  it('returns a list of reviews', async () => {
    const { res, data } = await browseReviews()
    expect(res.status).to.equal(200)
    // Expected shape from controller: { items, total, page, limit }
    expect(data).to.be.an('object')
    expect(data).to.have.keys(['items', 'total', 'page', 'limit'])
    expect(data.items).to.be.an('array')
    expect(data.total).to.be.a('number')
    expect(data.page).to.be.a('number')
    expect(data.limit).to.be.a('number')
  })

  // Should support page and limit params
  it('supports pagination query params', async () => {
    const { res, data } = await browseReviews({ page: 1, limit: 5 })
    expect(res.status).to.equal(200)
    expect(data.limit).to.equal(5)
    expect(data.page).to.equal(1)
  })
})
