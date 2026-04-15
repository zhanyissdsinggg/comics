# Admin RBAC Matrix

## Roles
- `super_admin`
- `editor`
- `operator`
- `support`

## Permission Matrix
| Action | super_admin | editor | operator | support |
|---|---|---|---|---|
| publish_series | Y | Y | N | N |
| unpublish_series | Y | Y | N | N |
| edit_series_metadata | Y | Y | Y | N |
| edit_creator_credits | Y | Y | Y | N |
| reorder_episodes | Y | Y | Y | N |
| bulk_episode_update | Y | Y | Y | N |
| manage_merchandising | Y | Y | Y | N |
| view_analytics | Y | Y | Y | N |
| reply_support_ticket | Y | N | Y | Y |
| manage_users | Y | N | N | N |
| update_system_settings | Y | N | N | N |
| manage_admin_members | Y | N | N | N |

## High-risk Actions Requiring Audit Log
- publish/unpublish series
- delete episode
- bulk episode update
- credits update
- system settings update
- admin membership/permission change

## Required Audit Event Fields
- `actorId`
- `actorRole`
- `action`
- `resourceType`
- `resourceId`
- `before`
- `after`
- `ip`
- `userAgent`
- `requestId`
- `createdAt`

## Default Security Policy
- Default deny.
- No privilege escalation by UI-only checks; server-side authorization is required.
- Every high-risk write endpoint must emit auditable events.
