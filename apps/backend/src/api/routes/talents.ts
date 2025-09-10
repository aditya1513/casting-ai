import { Router } from 'express';
import { 
  getTalents,
  getTalentById,
  createTalent,
  updateTalent,
  deleteTalent,
  searchTalents
} from '../../controllers/talentController';
import { authenticate } from '../../middleware/auth';
import { validateTalentCreation, validateTalentUpdate } from '../../validators/talent';

const router = Router();

// Public routes (for viewing)
router.get('/search', searchTalents);
router.get('/:id', getTalentById);
router.get('/', getTalents);

// Protected routes (require authentication)
router.post('/', authenticate, validateTalentCreation, createTalent);
router.put('/:id', authenticate, validateTalentUpdate, updateTalent);
router.delete('/:id', authenticate, deleteTalent);

export default router;