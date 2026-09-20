import { Router } from 'express';
import * as sectController from '../controllers/sectController.js';

const router = Router();

router.get('/', sectController.getSects);
router.get('/popular', sectController.getPopularSects);
router.get('/:id', sectController.getSectById);

export default router;
