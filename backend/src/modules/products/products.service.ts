import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPagination } from '../../utils/response';
import { CreateProductInput, UpdateProductInput, SellProductInput, ListSalesQuery } from './products.schema';
import { NotFoundError } from '../members/members.service';
import { Request } from 'express';

export async function listProducts(gymId: string, includeInactive = false) {
  return prisma.product.findMany({
    where: { gymId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
}

export async function createProduct(gymId: string, userId: string, data: CreateProductInput, req: Request) {
  const product = await prisma.product.create({
    data: { gymId, name: data.name, nameAr: data.nameAr, price: data.price, stockQuantity: data.stockQuantity },
  });
  await createAuditLog({
    gymId, userId, action: 'create', entityType: 'product', entityId: product.id,
    newValues: data as Record<string, unknown>, req,
  });
  return product;
}

export async function updateProduct(gymId: string, productId: string, userId: string, data: UpdateProductInput, req: Request) {
  const existing = await prisma.product.findFirst({ where: { id: productId, gymId } });
  if (!existing) throw new NotFoundError('Product not found');

  const updated = await prisma.product.update({ where: { id: productId }, data });
  await createAuditLog({
    gymId, userId, action: 'update', entityType: 'product', entityId: productId,
    oldValues: { price: Number(existing.price), stockQuantity: existing.stockQuantity, isActive: existing.isActive },
    newValues: data as Record<string, unknown>, req,
  });
  return updated;
}

export async function sellProducts(gymId: string, userId: string, data: SellProductInput, req: Request) {
  // Validate member if provided
  if (data.memberId) {
    const member = await prisma.member.findFirst({ where: { id: data.memberId, gymId } });
    if (!member) throw new NotFoundError('Member not found');
  }

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, gymId, isActive: true } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate all products exist and stock is sufficient
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) throw new NotFoundError(`Product ${item.productId} not found or inactive`);
    if (product.stockQuantity < item.quantity) {
      throw new InsufficientStockError(`Insufficient stock for "${product.name}" (have ${product.stockQuantity}, need ${item.quantity})`);
    }
  }

  const sales = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.price);
      const totalPrice = unitPrice * item.quantity;

      const sale = await tx.productSale.create({
        data: {
          gymId,
          productId: item.productId,
          memberId: data.memberId ?? null,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          paymentMethod: data.paymentMethod,
          soldBy: userId,
        },
        include: { product: { select: { name: true, nameAr: true } } },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      created.push(sale);
    }
    return created;
  });

  const grandTotal = sales.reduce((sum, s) => sum + Number(s.totalPrice), 0);

  await createAuditLog({
    gymId, userId, action: 'sell', entityType: 'product_sale',
    newValues: { items: data.items, total: grandTotal, paymentMethod: data.paymentMethod }, req,
  });

  return { sales, grandTotal };
}

export async function listSales(gymId: string, query: ListSalesQuery) {
  const { page, limit, dateFrom, dateTo } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductSaleWhereInput = { gymId };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = end;
    }
  }

  const [sales, total, sum] = await prisma.$transaction([
    prisma.productSale.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true, nameAr: true } },
        member: { select: { fullName: true, memberNumber: true } },
        seller: { select: { fullName: true } },
      },
    }),
    prisma.productSale.count({ where }),
    prisma.productSale.aggregate({ where, _sum: { totalPrice: true } }),
  ]);

  return {
    sales,
    pagination: buildPagination(page, limit, total),
    summary: { totalRevenue: Number(sum._sum.totalPrice ?? 0) },
  };
}

export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}
