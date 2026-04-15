# Admin Route Inventory

Generated from `backend/src/modules/admin/**/*.controller.ts`.

## Summary

- Total routes: 125
- Read routes: 54
- Session routes: 4
- Billing routes: 8
- Content-pipeline routes: 3
- Other mutation routes: 56

## Routes

| Method | Category | Path | Source |
| --- | --- | --- | --- |
| GET | read | `/admin/analytics/behavior/:userId` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:43` |
| GET | read | `/admin/analytics/segments` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:36` |
| GET | read | `/admin/analytics/stats` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:19` |
| GET | read | `/admin/analytics/users/:userId` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:26` |
| POST | mutation | `/admin/analytics/users/:userId/assess-churn` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:77` |
| POST | mutation | `/admin/analytics/users/:userId/calculate-ltv` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:69` |
| PATCH | mutation | `/admin/analytics/users/:userId/metrics` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:61` |
| PATCH | mutation | `/admin/analytics/users/:userId/tags` | `backend/src/modules/admin/controllers/admin-analytics.controller.ts:53` |
| POST | session | `/admin/auth/login` | `backend/src/modules/admin/admin-auth/controllers/admin-auth.controller.ts:82` |
| POST | session | `/admin/auth/logout` | `backend/src/modules/admin/admin-auth/controllers/admin-auth.controller.ts:292` |
| POST | session | `/admin/auth/refresh` | `backend/src/modules/admin/admin-auth/controllers/admin-auth.controller.ts:190` |
| POST | session | `/admin/auth/verify` | `backend/src/modules/admin/admin-auth/controllers/admin-auth.controller.ts:239` |
| GET | read | `/admin/billing` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:37` |
| DELETE | billing | `/admin/billing/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:107` |
| GET | read | `/admin/billing/plans` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:133` |
| POST | billing | `/admin/billing/plans` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:139` |
| PATCH | billing | `/admin/billing/plans/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:145` |
| GET | read | `/admin/billing/topups` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:48` |
| POST | billing | `/admin/billing/topups` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:54` |
| PATCH | billing | `/admin/billing/topups/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-billing.controller.ts:84` |
| GET | read | `/admin/branding` | `backend/src/modules/admin/admin-system/controllers/admin-branding.controller.ts:26` |
| POST | mutation | `/admin/branding` | `backend/src/modules/admin/admin-system/controllers/admin-branding.controller.ts:37` |
| GET | read | `/admin/comments` | `backend/src/modules/admin/admin-content/controllers/admin-comments.controller.ts:134` |
| DELETE | mutation | `/admin/comments/:id` | `backend/src/modules/admin/admin-content/controllers/admin-comments.controller.ts:218` |
| PATCH | mutation | `/admin/comments/hide` | `backend/src/modules/admin/admin-content/controllers/admin-comments.controller.ts:180` |
| PATCH | mutation | `/admin/comments/recalc-rating` | `backend/src/modules/admin/admin-content/controllers/admin-comments.controller.ts:197` |
| GET | read | `/admin/creators/audit` | `backend/src/modules/admin/controllers/admin-creators.controller.ts:13` |
| GET | read | `/admin/email` | `backend/src/modules/admin/admin-system/controllers/admin-email.controller.ts:69` |
| POST | mutation | `/admin/email` | `backend/src/modules/admin/admin-system/controllers/admin-email.controller.ts:76` |
| GET | read | `/admin/email/jobs` | `backend/src/modules/admin/admin-system/controllers/admin-email-jobs.controller.ts:20` |
| GET | read | `/admin/email/jobs/failed` | `backend/src/modules/admin/admin-system/controllers/admin-email-jobs.controller.ts:25` |
| POST | mutation | `/admin/email/jobs/retry` | `backend/src/modules/admin/admin-system/controllers/admin-email-jobs.controller.ts:30` |
| POST | mutation | `/admin/email/test` | `backend/src/modules/admin/admin-system/controllers/admin-email.controller.ts:131` |
| POST | content-pipeline | `/admin/generate-content` | `backend/src/modules/admin/admin-content/controllers/admin-content-generator.controller.ts:497` |
| GET | read | `/admin/logs` | `backend/src/modules/admin/admin-system/controllers/admin-logs.controller.ts:24` |
| DELETE | mutation | `/admin/logs/:id` | `backend/src/modules/admin/admin-system/controllers/admin-logs.controller.ts:54` |
| GET | read | `/admin/marketing/campaigns` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:26` |
| POST | mutation | `/admin/marketing/campaigns` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:33` |
| PATCH | mutation | `/admin/marketing/campaigns/:campaignId/targets/:userId` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:91` |
| DELETE | mutation | `/admin/marketing/campaigns/:id` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:55` |
| GET | read | `/admin/marketing/campaigns/:id` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:41` |
| PATCH | mutation | `/admin/marketing/campaigns/:id` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:47` |
| GET | read | `/admin/marketing/campaigns/:id/analytics` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:63` |
| POST | mutation | `/admin/marketing/campaigns/:id/analytics` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:69` |
| GET | read | `/admin/marketing/campaigns/:id/budget` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:103` |
| PATCH | mutation | `/admin/marketing/campaigns/:id/budget` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:110` |
| GET | read | `/admin/marketing/campaigns/:id/targets` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:77` |
| POST | mutation | `/admin/marketing/campaigns/:id/targets` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:83` |
| GET | read | `/admin/marketing/stats` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:118` |
| GET | read | `/admin/marketing/stats/by-segment` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:125` |
| GET | read | `/admin/marketing/stats/by-type` | `backend/src/modules/admin/controllers/admin-marketing.controller.ts:132` |
| GET | read | `/admin/members` | `backend/src/modules/admin/admin-system/controllers/admin-members.controller.ts:26` |
| POST | mutation | `/admin/members` | `backend/src/modules/admin/admin-system/controllers/admin-members.controller.ts:43` |
| PATCH | mutation | `/admin/members/:id` | `backend/src/modules/admin/admin-system/controllers/admin-members.controller.ts:54` |
| DELETE | mutation | `/admin/members/:id/2fa` | `backend/src/modules/admin/admin-system/controllers/admin-members.controller.ts:82` |
| POST | mutation | `/admin/members/:id/reset-2fa` | `backend/src/modules/admin/admin-system/controllers/admin-members.controller.ts:75` |
| PATCH | mutation | `/admin/members/:id/status` | `backend/src/modules/admin/admin-system/controllers/admin-members.controller.ts:66` |
| GET | read | `/admin/members/meta` | `backend/src/modules/admin/admin-system/controllers/admin-members.controller.ts:31` |
| POST | mutation | `/admin/members/sync-env` | `backend/src/modules/admin/admin-system/controllers/admin-members.controller.ts:36` |
| GET | read | `/admin/metrics` | `backend/src/modules/admin/admin-analytics/controllers/admin-metrics.controller.ts:15` |
| GET | read | `/admin/notifications` | `backend/src/modules/admin/admin-system/controllers/admin-notifications.controller.ts:41` |
| POST | mutation | `/admin/notifications` | `backend/src/modules/admin/admin-system/controllers/admin-notifications.controller.ts:58` |
| DELETE | mutation | `/admin/notifications/:id` | `backend/src/modules/admin/admin-system/controllers/admin-notifications.controller.ts:126` |
| GET | read | `/admin/orders` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:108` |
| DELETE | mutation | `/admin/orders/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:372` |
| POST | billing | `/admin/orders/adjust` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:299` |
| POST | billing | `/admin/orders/refund` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:164` |
| POST | billing | `/admin/orders/refund/:id` | `backend/src/modules/admin/admin-billing/controllers/admin-orders.controller.ts:283` |
| GET | read | `/admin/promotions` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:101` |
| POST | mutation | `/admin/promotions` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:131` |
| DELETE | mutation | `/admin/promotions/:id` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:193` |
| PATCH | mutation | `/admin/promotions/:id` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:162` |
| GET | read | `/admin/promotions/defaults` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:107` |
| PATCH | mutation | `/admin/promotions/defaults` | `backend/src/modules/admin/admin-content/controllers/admin-promotions.controller.ts:117` |
| GET | read | `/admin/rankings` | `backend/src/modules/admin/admin-analytics/controllers/admin-rankings.controller.ts:31` |
| GET | read | `/admin/recommendations/analytics` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:87` |
| POST | mutation | `/admin/recommendations/analytics` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:94` |
| GET | read | `/admin/recommendations/popular` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:124` |
| GET | read | `/admin/recommendations/rankings` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:56` |
| POST | mutation | `/admin/recommendations/rankings` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:63` |
| DELETE | mutation | `/admin/recommendations/rankings/:id` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:79` |
| PATCH | mutation | `/admin/recommendations/rankings/:id` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:71` |
| GET | read | `/admin/recommendations/rankings/:type/performance` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:114` |
| GET | read | `/admin/recommendations/slots` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:25` |
| POST | mutation | `/admin/recommendations/slots` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:32` |
| DELETE | mutation | `/admin/recommendations/slots/:id` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:48` |
| PATCH | mutation | `/admin/recommendations/slots/:id` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:40` |
| GET | read | `/admin/recommendations/slots/:id/performance` | `backend/src/modules/admin/controllers/admin-recommendation.controller.ts:107` |
| GET | read | `/admin/regions` | `backend/src/modules/admin/admin-system/controllers/admin-regions.controller.ts:97` |
| POST | mutation | `/admin/regions` | `backend/src/modules/admin/admin-system/controllers/admin-regions.controller.ts:107` |
| GET | read | `/admin/revenue/channels` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:168` |
| GET | read | `/admin/revenue/order-status-distribution` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:326` |
| GET | read | `/admin/revenue/promotions` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:215` |
| GET | read | `/admin/revenue/stats` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:100` |
| GET | read | `/admin/revenue/trend` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:128` |
| GET | read | `/admin/revenue/user-value-distribution` | `backend/src/modules/admin/admin-billing/controllers/admin-revenue.controller.ts:279` |
| GET | read | `/admin/series` | `backend/src/modules/admin/controllers/admin-series.controller.ts:262` |
| POST | mutation | `/admin/series` | `backend/src/modules/admin/controllers/admin-series.controller.ts:374` |
| DELETE | mutation | `/admin/series/:id` | `backend/src/modules/admin/controllers/admin-series.controller.ts:471` |
| GET | read | `/admin/series/:id` | `backend/src/modules/admin/controllers/admin-series.controller.ts:402` |
| PATCH | mutation | `/admin/series/:id` | `backend/src/modules/admin/controllers/admin-series.controller.ts:430` |
| GET | read | `/admin/series/:id/credits` | `backend/src/modules/admin/controllers/admin-series.controller.ts:415` |
| PATCH | mutation | `/admin/series/:id/credits` | `backend/src/modules/admin/controllers/admin-series.controller.ts:455` |
| GET | read | `/admin/series/:id/episodes` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:277` |
| POST | mutation | `/admin/series/:id/episodes` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:372` |
| DELETE | mutation | `/admin/series/:id/episodes/:episodeId` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:685` |
| PATCH | mutation | `/admin/series/:id/episodes/:episodeId` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:648` |
| POST | mutation | `/admin/series/:id/episodes/bulk` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:467` |
| POST | mutation | `/admin/series/:id/episodes/reorder` | `backend/src/modules/admin/controllers/admin-episodes.controller.ts:524` |
| POST | content-pipeline | `/admin/series/:id/episodes/upload` | `backend/src/modules/admin/controllers/admin-episodes-upload.controller.ts:110` |
| GET | read | `/admin/series/search/advanced` | `backend/src/modules/admin/controllers/admin-series.controller.ts:296` |
| GET | read | `/admin/stats` | `backend/src/modules/admin/admin-analytics/controllers/admin-stats.controller.ts:26` |
| GET | read | `/admin/stats/dashboard` | `backend/src/modules/admin/admin-analytics/controllers/admin-stats.controller.ts:17` |
| GET | read | `/admin/support` | `backend/src/modules/admin/admin-system/controllers/admin-support.controller.ts:79` |
| DELETE | mutation | `/admin/support/:id` | `backend/src/modules/admin/admin-system/controllers/admin-support.controller.ts:186` |
| PATCH | mutation | `/admin/support/:id/close` | `backend/src/modules/admin/admin-system/controllers/admin-support.controller.ts:170` |
| POST | mutation | `/admin/support/:id/reply` | `backend/src/modules/admin/admin-system/controllers/admin-support.controller.ts:122` |
| GET | read | `/admin/tracking` | `backend/src/modules/admin/admin-analytics/controllers/admin-tracking.controller.ts:24` |
| POST | mutation | `/admin/tracking` | `backend/src/modules/admin/admin-analytics/controllers/admin-tracking.controller.ts:29` |
| POST | content-pipeline | `/admin/upload/image` | `backend/src/modules/admin/admin-system/controllers/admin-upload.controller.ts:129` |
| GET | read | `/admin/users` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:60` |
| DELETE | mutation | `/admin/users/:id` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:154` |
| PATCH | mutation | `/admin/users/:id/block` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:140` |
| PATCH | mutation | `/admin/users/block` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:125` |
| GET | read | `/admin/users/support` | `backend/src/modules/admin/admin-system/controllers/admin-users.controller.ts:105` |

