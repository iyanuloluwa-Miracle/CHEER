import { PaymentsService } from '../../services/payments/payments.service';
import { WebhookFulfilmentService } from '../../services/webhooks/webhook-fulfilment.service';
import { ApiError } from '../../lib/errors';
import { defineApiHandler } from '../../lib/define-api';

/**
 * Bachs webhook receiver.
 * Requires raw body for signature verification.
 * Flow: verify signature → identify tip → GET checkout verify → validate → update.
 */
export default defineApiHandler(async (event) => {
  const rawBody = await readRawBody(event, false);
  if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
    throw new ApiError(400, 'WEBHOOK_MALFORMED', 'Empty webhook payload.');
  }

  const headers = getRequestHeaders(event);
  const payments = new PaymentsService();
  const parsed = await payments.handleWebhook({
    rawBody,
    headers,
  });

  if (!parsed.acknowledged) {
    const raw =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    let malformed = false;
    try {
      JSON.parse(raw);
    } catch {
      malformed = true;
    }

    if (malformed) {
      throw new ApiError(
        400,
        'WEBHOOK_MALFORMED',
        'Malformed webhook payload.',
      );
    }

    throw new ApiError(401, 'WEBHOOK_INVALID', 'Invalid webhook signature.');
  }

  if (!parsed.providerEventId || !parsed.eventType || !parsed.verification) {
    throw new ApiError(
      400,
      'WEBHOOK_MALFORMED',
      'Webhook acknowledged but missing required fields.',
    );
  }

  const fulfilment = new WebhookFulfilmentService();
  const result = await fulfilment.processSignedBachsEvent({
    providerEventId: parsed.providerEventId,
    eventType: parsed.eventType,
    tipId: parsed.tipId,
    verification: parsed.verification,
  });

  if (result.retryable) {
    throw new ApiError(
      503,
      'WEBHOOK_VERIFY_FAILED',
      'Unable to verify payment with provider. Please retry.',
    );
  }

  setResponseStatus(event, 200);
  return { ok: true, outcome: result.outcome };
});
