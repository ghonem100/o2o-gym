import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/rbac.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../types';
import { NotFoundError } from '../members/members.service';
import {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  sellProductSchema,
  listSalesSchema,
} from './products.schema';
import * as ProductsService from './products.service';

const router = Router();
router.use(authenticate);

// ── List products (owner + receptionist) ──
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = listProductsSchema.parse({ query: req.query });
    const includeInactive = !!query.includeInactive && req.user!.role === 'owner';
    const products = await ProductsService.listProducts(req.user!.gymId, includeInactive);
    sendSuccess(res, products);
  } catch (err) { next(err); }
});

// ── Sales history (owner + receptionist) ──
router.get('/sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = listSalesSchema.parse({ query: req.query });
    const result = await ProductsService.listSales(req.user!.gymId, query);
    sendSuccess(res, result, undefined, 200, result.pagination);
  } catch (err) { next(err); }
});

// ── Sell products (owner + receptionist) ──
router.post('/sell', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body } = sellProductSchema.parse({ body: req.body });
    const result = await ProductsService.sellProducts(req.user!.gymId, req.user!.userId, body, req);
    sendSuccess(res, result, 'Sale recorded', 201);
  } catch (err) {
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    if (err instanceof ProductsService.InsufficientStockError) { sendError(res, err.message, 409); return; }
    next(err);
  }
});

// ── Create product (owner only) ──
router.post('/', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body } = createProductSchema.parse({ body: req.body });
    const product = await ProductsService.createProduct(req.user!.gymId, req.user!.userId, body, req);
    sendSuccess(res, product, 'Product created', 201);
  } catch (err) { next(err); }
});

// ── Update product (owner only) ──
router.put('/:id', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { params, body } = updateProductSchema.parse({ params: req.params, body: req.body });
    const product = await ProductsService.updateProduct(req.user!.gymId, params.id, req.user!.userId, body, req);
    sendSuccess(res, product, 'Product updated');
  } catch (err) {
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    next(err);
  }
});

export default router;
