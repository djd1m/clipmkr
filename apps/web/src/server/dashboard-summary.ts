import { cache } from 'react';
import { getScreenRuntime } from './screen-runtime';
import { remainingLimits } from './limits';

// React cache ограничен текущим SSR request; account — часть ключа.
// Переиспользуем единственный reader квот и кредитов, без второго SQL-пути.
export const readDashboardSummary = cache(async (account: string) => {
  const { pool, config } = getScreenRuntime();
  return remainingLimits(pool, config.limits, account);
});
