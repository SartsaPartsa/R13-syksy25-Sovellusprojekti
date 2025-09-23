import { Router } from 'express';
import { getLatestPublic } from '../controllers/reviewController.js';

// Public endpoints for reviews (no auth required).
// Returns recent reviews along with the reviewer's basic info.
const router = Router();

router.get('/latest', getLatestPublic);

export default router;
