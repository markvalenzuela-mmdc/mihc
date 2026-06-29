# Future E2E Data Model Proposal

This document is a planning note only.
No Prisma migration should be created yet.

## Current Model

### SmokeRun

Used for the current smoke-check vertical slice.

Tracks:

- status
- startedAt
- finishedAt
- durationMs
- result
- artifactKey

## Future Models

### Scenario

Represents a reusable test scenario.

Examples:

- Website Health Check
- EnrollMate Freshman Flow
- EnrollMate Transferee Flow
- API Webhook Check

Suggested fields:

- id
- name
- description
- application
- type
- enabled
- createdAt
- updatedAt

### TestRun

Represents one execution of a scenario.

Suggested fields:

- id
- scenarioId
- status
- startedAt
- finishedAt
- durationMs
- result
- createdAt

### TestStep

Represents individual steps inside a run.

Examples:

- Stage 1 Student Information
- Stage 2 Parent Information
- Stage 3 Additional Information
- Stage 4 Confirmation

Suggested fields:

- id
- testRunId
- name
- status
- startedAt
- finishedAt
- durationMs
- errorMessage

### Artifact

Represents uploaded test evidence.

Examples:

- screenshot
- video
- trace
- report

Suggested fields:

- id
- testRunId
- type
- key
- contentType
- createdAt

## Notes

The current SmokeRun model should remain unchanged until the team confirms the E2E scope and dashboard requirements.