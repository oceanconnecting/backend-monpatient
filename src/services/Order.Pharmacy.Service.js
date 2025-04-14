// services/Order.Pharmacy.Service.js
export async function processOrder(prisma, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error('NOT_FOUND');
  if (order.status !== 'Pending') throw new Error('INVALID_STATUS');

  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'Processing' },
  });
}

export async function deliverOrder(prisma, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error('NOT_FOUND');
  if (order.status !== 'Processing') throw new Error('INVALID_STATUS');

  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'Delivered' },
  });
}