# Docs Index

This folder holds repository-level reference material that supports the live product and runtime operations.

## Contents

- [`operations/`](./operations): deploy, rollback, alerting, staging, and admin-route runbooks
- [`demo-cover-sources.md`](./demo-cover-sources.md): provenance notes for demo cover assets used in the storefront

## Operations docs

Use [`operations/`](./operations) for anything related to release safety or live-environment checks.

- `admin-route-inventory.md`: current admin route inventory in readable form
- `admin-route-inventory.json`: machine-readable admin route inventory output
- `deploy-gate-automation.md`: post-deploy verification and gate flow
- `staging-environment-blueprint.md`: expected staging environment setup
- `staging-admin-write-regression-checklist.md`: admin write-path regression checklist
- `rollback-playbook.md`: rollback procedure
- `oncall-playbook.md`: incident response notes
- `slo-and-alerts.md`: service-level expectations and alert posture
- `chaos-and-security-drill.md`: resilience/security drill checklist

## Maintenance notes

- Keep this folder for durable reference material, not throwaway notes.
- If a new operational workflow is added, index it here so the folder stays discoverable.
- Do not archive active runbooks into ad hoc subfolders without updating this index.
