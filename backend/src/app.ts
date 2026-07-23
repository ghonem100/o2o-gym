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
import productsRoutes from './modules/products/products.routes';
import superAdminRoutes from './modules/super-admin/super-admin.routes';
import gymsPublicRoutes from './modules/gyms/gyms-public.routes';

import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// FRONTEND_URL may hold one origin or a comma-separated list, so multiple
// frontend domains (e.g. an old and a new Vercel URL) can be allowed at once.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser requests (curl, health checks) send no Origin — allow them.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
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
app.use(`${API_V1}/products`, productsRoutes);
app.use(`${API_V1}/super-admin`, superAdminRoutes);
app.use(`${API_V1}/gyms`, gymsPublicRoutes); // public slug resolver

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
