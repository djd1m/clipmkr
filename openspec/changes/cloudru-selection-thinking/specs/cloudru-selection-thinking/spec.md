## ADDED Requirements

### Requirement: Disable reasoning only for Cloud.ru selection
The existing Cloud.ru selection request SHALL include chat_template_kwargs with thinking set to false and SHALL otherwise preserve its current request and validation contract.

#### Scenario: Cloud.ru selection request
- **WHEN** createSelector sends a request using the existing Cloud.ru provider
- **THEN** its JSON body contains chat_template_kwargs equal to {thinking:false}
- **AND** no new token cap, vendor thinking option, model switch, retry or timeout change is introduced

#### Scenario: OpenRouter isolation
- **WHEN** createSelector uses OpenRouter
- **THEN** its request does not contain chat_template_kwargs
- **AND** its existing JSON schema, provider restrictions and deadline remain unchanged

### Requirement: Preserve rejection and verify the real integration
Selection SHALL keep rejecting malformed, null, refused or truncated output through the existing validation boundary, and real uncapped worker evidence SHALL be distinguished from unit and bounded probe evidence.

#### Scenario: Invalid or failed completion
- **WHEN** the provider returns malformed content, refusal, finish_reason length or an HTTP/transport failure
- **THEN** the existing rejection outcome and single-request behavior remain intact

#### Scenario: Actual worker replay
- **WHEN** the correction is verified against the configured real provider
- **THEN** the existing uncapped worker request, transcript, prompt and validator produce a recorded actual outcome tied to source and image identity
- **AND** a failed or unexecuted replay is not labelled a provider PASS or a complete video CJM
