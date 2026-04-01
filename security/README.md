# Security Notes

This folder stores repository-tracked security support files.

## Contents

- [`audit-allowlist.json`](./audit-allowlist.json): approved advisory/package exceptions for audit tooling, each with an expiry date and justification

## Usage notes

- Every allowlist entry should include a real reason and an expiry date.
- Remove entries as soon as the underlying dependency issue is fixed.
- Do not use this file to permanently silence unresolved security debt.
