import { Router } from 'express';
import authRouter from './modules/auth';
import menuRouter from './modules/menu';
import tablesRouter from './modules/tables';
import ordersRouter from './modules/orders';
import paymentsRouter from './modules/payments';
import settingsRouter from './modules/settings';

const router = Router();

router.use('/auth', authRouter);
router.use('/menu', menuRouter);
router.use('/tables', tablesRouter);
router.use('/orders', ordersRouter);
router.use('/payments', paymentsRouter);
router.use('/settings', settingsRouter);

export default router;
