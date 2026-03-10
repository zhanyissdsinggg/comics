# Admin Route Inventory

Generated from `backend/src/modules/admin/**/*.controller.ts`.

## Summary

- Total routes: 113
- Read routes: 50
- Session routes: 4
- Billing routes: 8
- Content-pipeline routes: 3
- Other mutation routes: 48

## Routes

| Method | Category | Path | Source |
| --- | --- | --- | --- |
| GET | read | `/admin/analytics/behavior/:userId` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:40` |
| GET | read | `/admin/analytics/segments` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:33` |
| GET | read | `/admin/analytics/stats` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:16` |
| GET | read | `/admin/analytics/users/:userId` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:23` |
| POST | mutation | `/admin/analytics/users/:userId/assess-churn` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:71` |
| POST | mutation | `/admin/analytics/users/:userId/calculate-ltv` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:64` |
| PATCH | mutation | `/admin/analytics/users/:userId/metrics` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:57` |
| PATCH | mutation | `/admin/analytics/users/:userId/tags` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:50` |
| POST | session | `/admin/auth/login` | `backend/src/modules/admin/admin-auth/controllers/admin-auth.controller.ts:61` |
| POST | session | `/admin/auth/logout` | `backend/src/modules/admin/admin-auth/controllers/admin-auth.controller.ts:242` |
| POST | session | `/admin/auth/refresh` | `backend/src/modules/admin/admin-auth/controllers/admin-auth.controller.ts:149` |
| POST | session | `/admin/auth/verify` | `backend/src/modules/admin/admin-auth/controllers/admin-auth.controller.ts:193` |
| GET | read | `/admin/billing` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:33` |
| DELETE | billing | `/admin/billing/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:101` |
| GET | read | `/admin/billing/plans` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:126` |
| POST | billing | `/admin/billing/plans` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:132` |
| PATCH | billing | `/admin/billing/plans/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:137` |
| GET | read | `/admin/billing/topups` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:44` |
| POST | billing | `/admin/billing/topups` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:50` |
| PATCH | billing | `/admin/billing/topups/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:79` |
| GET | read | `/admin/branding` | `backend/src/modules/admin/admin-system/controllers/admin-branding.controller.ts:22` |
| POST | mutation | `/admin/branding` | `backend/src/modules/admin/admin-system/controllers/admin-branding.controller.ts:33` |
| GET | read | `/admin/comments` | `backend/src/modules/admin/admin-content/controllers/admin-comments.controller.ts:22` |
| DELETE | mutation | `/admin/comments/:id` | `backend/src/modules/admin/admin-content/controllers/admin-comments.controller.ts:95` |
| PATCH | mutation | `/admin/comments/hide` | `backend/src/modules/admin/admin-content/controllers/admin-comments.controller.ts:60` |
| PATCH | mutation | `/admin/comments/recalc-rating` | `backend/src/modules/admin/admin-content/controllers/admin-comments.controller.ts:75` |
| GET | read | `/admin/email` | `backend/src/modules/admin/admin-system/controllers/admin-email.controller.ts:40` |
| POST | mutation | `/admin/email` | `backend/src/modules/admin/admin-system/controllers/admin-email.controller.ts:50` |
| GET | read | `/admin/email/jobs` | `backend/src/modules/admin/admin-system/controllers/admin-email-jobs.controller.ts:17` |
| GET | read | `/admin/email/jobs/failed` | `backend/src/modules/admin/admin-system/controllers/admin-email-jobs.controller.ts:22` |
| POST | mutation | `/admin/email/jobs/retry` | `backend/src/modules/admin/admin-system/controllers/admin-email-jobs.controller.ts:27` |
| POST | mutation | `/admin/email/test` | `backend/src/modules/admin/admin-system/controllers/admin-email.controller.ts:114` |
| POST | content-pipeline | `/admin/generate-content` | `backend/src/modules/admin/admin-content/controllers/admin-content-generator.controller.ts:413` |
| GET | read | `/admin/logs` | `backend/src/modules/admin/admin-system/controllers/admin-logs.controller.ts:31` |
| DELETE | mutation | `/admin/logs/:id` | `backend/src/modules/admin/admin-system/controllers/admin-logs.controller.ts:63` |
| GET | read | `/admin/marketing/campaigns` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:23` |
| POST | mutation | `/admin/marketing/campaigns` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:30` |
| PATCH | mutation | `/admin/marketing/campaigns/:campaignId/targets/:userId` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:83` |
| DELETE | mutation | `/admin/marketing/campaigns/:id` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:50` |
| GET | read | `/admin/marketing/campaigns/:id` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:37` |
| PATCH | mutation | `/admin/marketing/campaigns/:id` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:43` |
| GET | read | `/admin/marketing/campaigns/:id/analytics` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:57` |
| POST | mutation | `/admin/marketing/campaigns/:id/analytics` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:63` |
| GET | read | `/admin/marketing/campaigns/:id/budget` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:94` |
| PATCH | mutation | `/admin/marketing/campaigns/:id/budget` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:101` |
| GET | read | `/admin/marketing/campaigns/:id/targets` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:70` |
| POST | mutation | `/admin/marketing/campaigns/:id/targets` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:76` |
| GET | read | `/admin/marketing/stats` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:108` |
| GET | read | `/admin/marketing/stats/by-segment` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:115` |
| GET | read | `/admin/marketing/stats/by-type` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:122` |
| GET | read | `/admin/metrics` | `backend/src/modules/admin/admin-analytics/controllers/admin-metrics.controller.ts:12` |
| GET | read | `/admin/notifications` | `backend/src/modules/admin/admin-system/controllers/admin-notifications.controller.ts:37` |
| POST | mutation | `/admin/notifications` | `backend/src/modules/admin/admin-system/controllers/admin-notifications.controller.ts:54` |
| DELETE | mutation | `/admin/notifications/:id` | `backend/src/modules/admin/admin-system/controllers/admin-notifications.controller.ts:120` |
| GET | read | `/admin/orders` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:85` |
| DELETE | mutation | `/admin/orders/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:326` |
| POST | billing | `/admin/orders/adjust` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:254` |
| POST | billing | `/admin/orders/refund` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:127` |
| POST | billing | `/admin/orders/refund/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:239` |
| GET | read | `/admin/promotions` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:98` |
| POST | mutation | `/admin/promotions` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:127` |
| DELETE | mutation | `/admin/promotions/:id` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:187` |
| PATCH | mutation | `/admin/promotions/:id` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:157` |
| GET | read | `/admin/promotions/defaults` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:104` |
| PATCH | mutation | `/admin/promotions/defaults` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:114` |
| GET | read | `/admin/rankings` | `backend/src/modules/admin/admin-analytics/controllers/admin-rankings.controller.ts:28` |
| GET | read | `/admin/recommendations/analytics` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:78` |
| POST | mutation | `/admin/recommendations/analytics` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:85` |
| GET | read | `/admin/recommendations/popular` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:114` |
| GET | read | `/admin/recommendations/rankings` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:50` |
| POST | mutation | `/admin/recommendations/rankings` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:57` |
| DELETE | mutation | `/admin/recommendations/rankings/:id` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:71` |
| PATCH | mutation | `/admin/recommendations/rankings/:id` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:64` |
| GET | read | `/admin/recommendations/rankings/:type/performance` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:104` |
| GET | read | `/admin/recommendations/slots` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:22` |
| POST | mutation | `/admin/recommendations/slots` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:29` |
| DELETE | mutation | `/admin/recommendations/slots/:id` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:43` |
| PATCH | mutation | `/admin/recommendations/slots/:id` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:36` |
| GET | read | `/admin/recommendations/slots/:id/performance` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:97` |
| GET | read | `/admin/regions` | `backend/src/modules/admin/admin-system/controllers/admin-regions.controller.ts:54` |
| POST | mutation | `/admin/regions` | `backend/src/modules/admin/admin-system/controllers/admin-regions.controller.ts:63` |
| GET | read | `/admin/revenue/channels` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:165` |
| GET | read | `/admin/revenue/order-status-distribution` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:323` |
| GET | read | `/admin/revenue/promotions` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:212` |
| GET | read | `/admin/revenue/stats` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:97` |
| GET | read | `/admin/revenue/trend` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:125` |
| GET | read | `/admin/revenue/user-value-distribution` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:276` |
| GET | read | `/admin/series` | `backend/src/modules/admin/controllers/admin-series.controller.ts:56` |
| POST | mutation | `/admin/series` | `backend/src/modules/admin/controllers/admin-series.controller.ts:117` |
| DELETE | mutation | `/admin/series/:id` | `backend/src/modules/admin/controllers/admin-series.controller.ts:165` |
| GET | read | `/admin/series/:id` | `backend/src/modules/admin/controllers/admin-series.controller.ts:138` |
| PATCH | mutation | `/admin/series/:id` | `backend/src/modules/admin/controllers/admin-series.controller.ts:148` |
| GET | read | `/admin/series/:id/episodes` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:189` |
| POST | mutation | `/admin/series/:id/episodes` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:202` |
| DELETE | mutation | `/admin/series/:id/episodes/:episodeId` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:346` |
| PATCH | mutation | `/admin/series/:id/episodes/:episodeId` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:320` |
| POST | mutation | `/admin/series/:id/episodes/bulk` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:276` |
| POST | content-pipeline | `/admin/series/:id/episodes/upload` | `backend/src/modules/admin/controllers/admin-episodes-upload.controller.ts:89` |
| GET | read | `/admin/series/search/advanced` | `backend/src/modules/admin/controllers/admin-series.controller.ts:62` |
| GET | read | `/admin/stats` | `backend/src/modules/admin/admin-analytics/controllers/admin-stats.controller.ts:23` |
| GET | read | `/admin/stats/dashboard` | `backend/src/modules/admin/admin-analytics/controllers/admin-stats.controller.ts:14` |
| GET | read | `/admin/support` | `backend/src/modules/admin/admin-system/controllers/admin-support.controller.ts:29` |
| DELETE | mutation | `/admin/support/:id` | `backend/src/modules/admin/admin-system/controllers/admin-support.controller.ts:121` |
| PATCH | mutation | `/admin/support/:id/close` | `backend/src/modules/admin/admin-system/controllers/admin-support.controller.ts:106` |
| POST | mutation | `/admin/support/:id/reply` | `backend/src/modules/admin/admin-system/controllers/admin-support.controller.ts:78` |
| GET | read | `/admin/tracking` | `backend/src/modules/admin/admin-analytics/controllers/admin-tracking.controller.ts:22` |
| POST | mutation | `/admin/tracking` | `backend/src/modules/admin/admin-analytics/controllers/admin-tracking.controller.ts:31` |
| POST | content-pipeline | `/admin/upload/image` | `backend/src/modules/admin/admin-system/controllers/admin-upload.controller.ts:36` |
| GET | read | `/admin/users` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:44` |
| DELETE | mutation | `/admin/users/:id` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:108` |
| PATCH | mutation | `/admin/users/:id/block` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:95` |
| PATCH | mutation | `/admin/users/block` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:81` |
| GET | read | `/admin/users/support` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:63` |

