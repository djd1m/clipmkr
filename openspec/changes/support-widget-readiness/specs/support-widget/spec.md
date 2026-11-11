## ADDED Requirements

### Requirement: native child ready before first identity
The application SHALL await WIDGET_LOADED from the configured canonical iframe window and origin before resolving its widget loader. DOM attachment alone SHALL NOT count as readiness. Existing 8s timeout, explicit opt-in, epoch/logout and hide-only close SHALL remain.

#### Scenario: cold first identify
- **WHEN** a verified user explicitly opts in and identifies for the first time while the child listener initializes asynchronously
- **THEN** the first setUser reaches that child and initiates one identity exchange after native readiness

#### Scenario: untrusted or missing readiness
- **WHEN** another window/origin/type sends a message or the canonical child never becomes ready
- **THEN** loading stays pending until genuine readiness or the existing bounded failure

#### Scenario: reuse and replacement
- **WHEN** the same previously observed ready iframe is reused
- **THEN** it opens without waiting for another one-shot signal, while a replacement iframe requires its own readiness

### Requirement: anonymous native session isolation across cold account switch
The application SHALL clear prior native identity with SDK logout before any fresh child reads identity/history, including anonymous and explicitly identified opening. Existing child reset SHALL retire stale callbacks before showing a fresh ready child, preserve remote history, require opt-in for JWT, and fail closed within the existing bound.

#### Scenario: cold A to B anonymous
- **GIVEN** native A cookies persist after full navigation and app logout while the SDK is absent
- **WHEN** B logs in and opens anonymous support without consent
- **THEN** native A auth/history is not requested or shown and no automatic JWT is issued

#### Scenario: pending old child during anonymous reset
- **WHEN** an existing identified child has delayed identity callbacks or ready messages
- **THEN** they cannot authorize showing its old identity after anonymous reset, and failure or authority cancellation prevents show


#### Scenario: cold identified B with persisted A identity
- **GIVEN** A vendor identity persists while a new page has no SDK
- **WHEN** B explicitly opts in and identifies
- **THEN** fresh bootstrap clears A before any native A auth/history request and the subsequent explicit exchange identifies B
