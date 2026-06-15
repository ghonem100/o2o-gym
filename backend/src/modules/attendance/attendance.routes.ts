import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  faceCheckInHandler,
  barcodeCheckInHandler,
  manualCheckInHandler,
  listAttendanceHandler,
  todayAttendanceHandler,
} from './attendance.controller';

const router = Router();

router.use(authenticate);

router.get('/', listAttendanceHandler);
router.get('/today', todayAttendanceHandler);
router.post('/face', faceCheckInHandler);
router.post('/barcode', barcodeCheckInHandler);
router.post('/manual', manualCheckInHandler);

export default router;
