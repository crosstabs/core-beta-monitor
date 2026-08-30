# Crosstabs Core beta monitor

This repository is the independent, public, exact-identity synthetic monitor
for the controlled Crosstabs Core beta.

The monitor is deliberately isolated from the Upptime status repository:

- no personal access token is available to these workflows;
- every GitHub Action is pinned to a full immutable commit;
- the default workflow token is read-only and each job declares its own narrow
  permissions;
- the browser journey checks the expected source SHA and Vercel deployment ID
  before and after the sample workflow;
- retained evidence is aggregate-only and contains no respondent or user
  content.

## Lifecycle

`synthetic/expected-production.json` remains `pending` until an exact
production deployment passes the release gates. Pending configuration runs do
not execute the browser journey and are not launch evidence.

Activation is a reviewed pull request that binds one full source SHA, one
`dpl_*` deployment ID, and the SHA-256 of the committed browser contract.
Production invitations remain blocked until a successful scheduled or manual
run produces the retained 90-day receipt required by the Core beta launch
packet.

## Local verification

```sh
npm ci --ignore-scripts --prefix synthetic
npm test --prefix synthetic
./synthetic/node_modules/.bin/playwright test --list \
  --config=synthetic/playwright.config.ts
```

This repository monitors availability and one deterministic sample journey. It
does not replace the production deployment, load, rollback, accessibility,
operator-alert, or support-readiness gates.
