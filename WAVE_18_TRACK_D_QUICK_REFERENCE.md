# Wave 18 Track D - Quick Reference

## URLs
- **Admin Page**: `http://localhost:3000/admin/hotels/pnl`
- **API GET**: `GET /api/hotels/pnl/monthly?hotelId={id}&year={year}`
- **API PUT**: `PUT /api/hotels/pnl/monthly` (JSON body)

## Key Files
- **API**: `pages/api/hotels/pnl/monthly.ts` (234 lines)
- **UI**: `pages/admin/hotels/pnl.tsx` (280 lines)
- **Server**: `lib/hotels/pnlPageServer.ts` (26 lines)
- **Schema**: `prisma/schema.prisma` (HotelPnlMonthly model added)
- **Tests**: `tests/critical/api/hotels_pnl_monthly.test.ts` (14 tests), `tests/critical/pages/admin_hotels_pnl.test.ts` (4 tests)

## Deployment Commands
```bash
# Apply database migration
yarn prisma migrate deploy

# Run tests
yarn test --testPathPatterns="hotels_pnl"

# Full test suite
yarn test --runInBand

# Build and start
yarn build && yarn start
```

## RBAC Access
- **Allowed Roles**: CEO, COO, FINANCE, HOTEL_ADMIN
- **Denied Roles**: EMPLOYEE, all others → 403 Forbidden

## Data Fields (per month)
| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| baseRevenue | Decimal(19,2) | Yes | — |
| payroll | Decimal(19,2) | Yes | 0 |
| utilities | Decimal(19,2) | Yes | 0 |
| repairsMaintenance | Decimal(19,2) | Yes | 0 |
| marketing | Decimal(19,2) | Yes | 0 |
| otaCommissions | Decimal(19,2) | Yes | 0 |
| insurance | Decimal(19,2) | Yes | 0 |
| propertyTax | Decimal(19,2) | Yes | 0 |
| adminGeneral | Decimal(19,2) | Yes | 0 |
| other1Label | String | Yes | — |
| other1Amount | Decimal(19,2) | Yes | 0 |
| other2Label | String | Yes | — |
| other2Amount | Decimal(19,2) | Yes | 0 |
| notes | String | Yes | — |

## Computed Fields (calculated on response)
- **totalExpenses** = payroll + utilities + repairsMaintenance + marketing + otaCommissions + insurance + propertyTax + adminGeneral + other1Amount + other2Amount
- **net** = baseRevenue - totalExpenses

## Test Status
✅ **196/196 Tests Passing**
- 16 new Hotel P&L tests
- 180 existing tests (no regressions)

## Migration
- **Name**: `20251209000000_add_hotel_pnl_monthly`
- **File**: `prisma/migrations/20251209000000_add_hotel_pnl_monthly/migration.sql`
- **Status**: Ready for deployment

---

For full details, see `WAVE_18_TRACK_D_COMPLETION.md`
