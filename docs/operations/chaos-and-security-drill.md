# Chaos And Security Drill

## Non-destructive Chaos Drill
Run this to validate resilience and fallback paths:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
FRONTEND_URL=https://www.gushcomics.com \
npm run ops:chaos-drill
```

What it covers:
- Health controller degradation tests.
- Live post-deploy probe.
- Lightweight load smoke.

## Security Baseline Drill
Run this to validate baseline hardening and exposure posture:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
FRONTEND_URL=https://www.gushcomics.com \
npm run ops:security-baseline
```

What it checks:
- HTTPS enforcement.
- Security headers on backend and frontend.
- `X-Powered-By` exposure.
- Observability endpoint access control.

## Scheduled Drill Workflow
- `.github/workflows/resilience-drill.yml`
- Default schedule: weekly (Monday UTC)
