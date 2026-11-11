import 'server-only';

import { mockSiteData } from './mock';
import type { SiteData } from './types';

/** The app's data source. Swap the implementation here when Neon replaces the mock. */
export function getSiteData(): SiteData {
  return mockSiteData;
}

export type { SiteData };
