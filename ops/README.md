# Ops Assets

This folder stores live operations assets that support monitoring and incident response.

## Contents

- [`alerts/prometheus.rules.yaml`](./alerts/prometheus.rules.yaml): Prometheus alert rules for API error rate, latency, and queue backlog thresholds

## Usage notes

- Treat these files as deployment/runtime inputs, not disposable examples.
- If alert rules change, update the related runbooks under [`docs/operations/`](../docs/operations).
- Keep alert definitions close to actual production signals; do not store one-off experiments here.
