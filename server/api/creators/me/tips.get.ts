import { TipStatus } from '../../../db/enums';
import type { TipStatus as TipStatusType } from '../../../db/schema';
import { CreatorsService } from '../../../services/creators/creators.service';
import type { ListTipsQuery } from '../../../services/creators/dashboard.types';
import { TIP_AMOUNT_PATTERN } from '../../../services/tips/tips.constants';
import { ApiError } from '../../../lib/errors';
import { requireUser } from '../../../lib/auth';
import { defineApiHandler } from '../../../lib/define-api';

function emptyToUndefined(value: unknown): string | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  return typeof value === 'string' ? value : String(value);
}

export default defineApiHandler(async (event) => {
  const user = await requireUser(event);
  const q = getQuery(event);

  const statusRaw = emptyToUndefined(q.status);
  let status: TipStatusType | undefined;
  if (statusRaw) {
    if (!Object.values(TipStatus).includes(statusRaw as TipStatusType)) {
      throw new ApiError(400, 'INVALID_STATUS', 'Invalid tip status filter.');
    }
    status = statusRaw as TipStatusType;
  }

  const minAmount = emptyToUndefined(q.minAmount);
  const maxAmount = emptyToUndefined(q.maxAmount);
  if (minAmount && !TIP_AMOUNT_PATTERN.test(minAmount)) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'Invalid minAmount.');
  }
  if (maxAmount && !TIP_AMOUNT_PATTERN.test(maxAmount)) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'Invalid maxAmount.');
  }

  const page = q.page != null ? Number(q.page) : 1;
  const pageSize = q.pageSize != null ? Number(q.pageSize) : 20;
  if (!Number.isInteger(page) || page < 1) {
    throw new ApiError(400, 'INVALID_PAGE', 'page must be a positive integer.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new ApiError(
      400,
      'INVALID_PAGE_SIZE',
      'pageSize must be between 1 and 50.',
    );
  }

  const query: ListTipsQuery = {
    status,
    from: emptyToUndefined(q.from),
    to: emptyToUndefined(q.to),
    minAmount,
    maxAmount,
    page,
    pageSize,
  };

  const creators = new CreatorsService();
  return creators.listMyTips(user.sub, query);
});
