import { Router } from 'express'
import { auth } from '../helper/auth.js'
import {
  listGroups,
  createGroup,
  streamAllGroups,
  getGroup,
  joinGroup,
  listMembers,
  updateMemberStatus,
  leaveGroup,
  deleteGroup,
  removeMember,
  listGroupMovies,
  addGroupMovie,
  deleteGroupMovie,
  addShowtime,
  deleteShowtime,
  streamGroup,
  myMembership,
} from '../controllers/groupController.js'

const router = Router()

// list groups
router.get('/', listGroups)

// create group; owner added as moderator
router.post('/', auth, createGroup)

// global group list stream (token required)
router.get('/stream', streamAllGroups)

// group detail
router.get('/:id', getGroup)

// join request (sets PENDING)
router.post('/:id/join', auth, joinGroup)

router.get('/:id/members', auth, listMembers)

// approve/reject member (owner/moderator)
router.patch('/:id/members/:userId', auth, updateMemberStatus)

// leave group (owner cannot)
router.delete('/:id/members/me', auth, leaveGroup)

// delete group (owner only)
router.delete('/:id', auth, deleteGroup)

// remove member (owner/moderator)
router.delete('/:id/members/:userId', auth, removeMember)

router.get('/:id/movies', auth, listGroupMovies)

// add movie (members)
router.post('/:id/movies', auth, addGroupMovie)

// delete movie (added-by only)
router.delete('/:id/movies/:gmId', auth, deleteGroupMovie)

// add showtime (members)
router.post('/:id/movies/:gmId/showtimes', auth, addShowtime)

// delete showtime (added-by only)
router.delete('/:id/movies/:gmId/showtimes/:sid', auth, deleteShowtime)

// group stream endpoint
router.get('/:id/stream', streamGroup)

// current user's membership
router.get('/:id/membership/me', auth, myMembership)

export default router
