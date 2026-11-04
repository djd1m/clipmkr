## ADDED Requirements

### Requirement: Actual approved screen composition
The application SHALL realize the Cabinet and Montage upload, result and packages compositions defined by the pinned style contract in features/mockup-ui-realization/01_requirements.md, including meaningful layout differences and actual product data.

#### Scenario: Cabinet upload and Montage upload
- **WHEN** the authenticated dashboard is opened in either layout
- **THEN** Cabinet shows compact file/recent regions beside the balance/limit aside while Montage shows the approved large introduction/file region beside a narrow preview
- **AND** the existing native file chooser is actionable and optional controls are initially closed but remain mounted

#### Scenario: Results and packages use their approved compositions
- **WHEN** either layout displays results or packages
- **THEN** Cabinet shows selected player/metadata with fragment rows, or three compact offer columns
- **AND** Montage shows intro with the stable clip gallery, or numbered horizontal offer rows
- **AND** real media, prices, eligibility, controls and statuses replace demonstration data without changing the approved composition

### Requirement: Preserve existing operation ownership
The application SHALL preserve upload, media, checkout and account boundaries during presentation changes and SHALL report only observed acknowledged upload progress.

#### Scenario: Layout and theme change during an operation
- **WHEN** preferences change during upload, playback or checkout
- **THEN** the same state owner, connected native input or player, identity keys and pending operation survive
- **AND** the preference change initiates no new upload, completion, job, reservation, checkout or unexpected RPC/RSC request

#### Scenario: Pause, reload and reselect
- **WHEN** an upload pauses or reloads before its full manifest is known
- **THEN** current-session acknowledged bytes are labelled as last observed and reload progress is unknown until explicit continuation reconciles server parts
- **AND** reselect validates the same file without network mutation and partial progress is never stored as the v2 complete manifest

### Requirement: Demonstrate actual visual and functional acceptance
The implementation SHALL be accepted using paired original-reference and actual-application evidence with geometry checks, lifecycle proofs and exact published source/image identity.

#### Scenario: Parameterized visual verification
- **WHEN** final verification runs
- **THEN** it covers both layouts, both themes, three screens, six specified widths and Chromium/WebKit, plus named breakpoint and interaction checks
- **AND** negative controls detect restored legacy bodies and state-owner remounts

#### Scenario: Published acceptance
- **WHEN** the owner receives the implementation on clipmkr.ru
- **THEN** actual paired screens and real action evidence identify the deployed source/image and preserved data
- **AND** unexecuted payment/provider/ordinary90/blogger120 cases remain explicitly unproven rather than inheriting old baseline PASS
- **AND** separate Cloud release waits for manual owner acceptance
