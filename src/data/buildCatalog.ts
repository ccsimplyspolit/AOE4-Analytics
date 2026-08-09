import { BUNDLED_BUILD_ORDERS } from './buildOrders'
import { buildCatalogEntries } from '@domain/buildCatalog'

/** The searchable Tincture archive. The source list is glob-generated so new JSON imports are picked up automatically. */
export const BUILD_CATALOG = buildCatalogEntries(BUNDLED_BUILD_ORDERS)
