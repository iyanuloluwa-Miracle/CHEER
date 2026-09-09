import { PaymentsService } from '../../../services/payments/payments.service';
import { ApiError } from '../../../lib/errors';
import { defineApiHandler } from '../../../lib/define-api';

export default defineApiHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? '';
  const payments = new PaymentsService();
  const result = await payments.getPublicPaymentStatus(id);
  if (!result) {
    throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  }
  return result;
});
