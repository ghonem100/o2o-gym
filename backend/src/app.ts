import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './modules/auth/auth.routes';
import membersRoutes from './modules/members/members.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import settingsRoutes from './modules/settings/settings.routes';
import uploadsRoutes from './modules/uploads/uploads.routes';

import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down.' },
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const API_V1 = '/api/v1';
app.use(`${API_V1}/auth`, authRoutes);
app.use(`${API_V1}/members`, membersRoutes);
app.use(`${API_V1}/subscriptions`, subscriptionsRoutes);
app.use(`${API_V1}/attendance`, attendanceRoutes);
app.use(`${API_V1}/payments`, paymentsRoutes);
app.use(`${API_V1}/expenses`, expensesRoutes);
app.use(`${API_V1}/analytics`, analyticsRoutes);
app.use(`${API_V1}/notifications`, notificationsRoutes);
app.use(`${API_V1}/settings`, settingsRoutes);
app.use(`${API_V1}/uploads`, uploadsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
