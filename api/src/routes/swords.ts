import { Router } from 'express';
import * as swordController from '../controllers/swordController.js';

const router = Router();

router.get('/', swordController.getSwords);
router.get('/popular', swordController.getPopularSwords);
router.get('/:id', swordController.getSwordById);

export default router;
