import { Router } from 'express';
import * as swordsmanController from '../controllers/swordsmanController.js';

const router = Router();

router.get('/', swordsmanController.getSwordsmen);
router.get('/latest', swordsmanController.getLatestSwordsmen);
router.get('/:id', swordsmanController.getSwordsmanById);

export default router;
