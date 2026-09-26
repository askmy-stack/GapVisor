# Feature Specification: Extract Hardcoded Data to JSON

**Feature Branch**: `001-extract-data-to-json`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "I already have a working React application. The application currently has hardcoded business data and sample data inside React pages and components. Update the application so that this data is moved into JSON files under the `src/data` folder. Review the existing React code. Find hardcoded arrays, objects, table rows, cards, dashboard values, chart values, dropdown options, users, customers, products, notifications, and other sample records. Create JSON files under `src/data`. Organize the JSON files by page or feature. Move only application data and sample records into the JSON files. Update React components to import and use the JSON files. Remove the old hardcoded data from the components. Keep simple page titles, button labels, form labels, messages, and other UI text inside the components unless they are repeated data values. Keep colors, fonts, spacing, widths, heights, page sizes, chart sizes, icons, class names, and layout settings outside the JSON files. Keep functions, hooks, state, event handlers, formatting, calculations, and UI logic inside the React code. Do not place React code, functions, or styling values inside JSON files. Do not change the UI design. Do not change navigation or routes. Do not add a backend, database, or API. Make sure all existing screens and features continue working. The final result should have clean React components and organized JSON data files containing only business and sample data."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Change demo numbers on the core analytics screens without touching code (Priority: P1)

A demo owner preparing GapVisor for a prospect meeting needs the headline figures on the
Visibility Dashboard and Model Monitoring screens to match the prospect's industry. Today every
KPI value, chart series, competitor share, citation source, and alert is written inside the
screen and component files, so changing a single percentage means editing React code and risking
a broken render. After this change, the person opens one data file per screen, edits the values,
reloads, and sees the new numbers — with no code file touched.

**Why this priority**: These two screens carry the highest density of business data and are the
first screens shown in any demo. Delivering only this story already removes the most frequent
reason someone would have to edit component code, and it establishes the file organization and
naming pattern every later story reuses.

**Independent Test**: Open the data files backing the Visibility Dashboard and Model Monitoring,
change a KPI value, a chart data point, and a competitor name; reload the application and confirm
each edit appears on screen, that no component file was modified to achieve it, and that both
screens render exactly as before apart from the edited values.

**Acceptance Scenarios**:

1. **Given** the Visibility Dashboard renders five KPI cards, a share-over-time chart, inclusion
   and sentiment charts, competitor share-of-voice, citation coverage, and an alerts list,
   **When** a person edits the corresponding values in that screen's data files and reloads,
   **Then** every edited value appears on screen and no other displayed content changes.
2. **Given** the Model Monitoring screen renders model status cards, a performance comparison
   chart, a metrics table, a recent-runs list, and insight cards, **When** a person changes a
   model's inclusion rate and status in the data file and reloads, **Then** the status card and
   the metrics table both reflect the new values from that single edit.
3. **Given** a data record previously carried a theme color or icon alongside its business
   values, **When** that record is moved to a data file, **Then** the color and icon are resolved
   by the component and the rendered card looks identical to before the change.
4. **Given** a person introduces a typo into a data file (for example a missing comma), **When**
   the application is built, **Then** the failure is reported as a data file problem rather than
   surfacing as a blank screen.

---

### User Story 2 - Every remaining screen follows the same data pattern (Priority: P2)

A developer maintaining GapVisor needs to know, for any screen, exactly where its data lives.
The remaining screens — Prompt Library, Answer Analysis, Competitor Intelligence, Content
Recommendations, Experiments & Impact, Reports & Billing, and Workspace Setup — each still carry
their sample records inline, including large nested records such as the AI answers with their
reasoning factors, cited sources, and flagged inaccuracies. After this story, every screen's data
is externalized under the same per-screen organization as Story 1.

**Why this priority**: This completes coverage and is what makes the pattern a rule rather than an
exception, but each screen is independently valuable and none of them blocks Story 1.

**Independent Test**: For each remaining screen, confirm the screen's data can be located in a
single predictable place, edit one record there, reload, and confirm the screen reflects the edit
and still renders every section it rendered before.

**Acceptance Scenarios**:

1. **Given** the Answer Analysis screen shows a list of AI answer records with a detail pane,
   **When** a record's answer text, reasoning factors, cited sources, or flagged inaccuracies are
   edited in the data file and the record is selected, **Then** the detail pane shows the edited
   content and selection, filtering, and the master/detail interaction still work.
2. **Given** the Content Recommendations screen filters recommendations by content type, **When**
   a recommendation's content type is changed in the data file, **Then** the recommendation
   appears under the new tab and the result count updates accordingly.
3. **Given** the Workspace Setup wizard pre-selects suggested categories, regions, monitoring
   frequencies, and starting competitors, **When** those option lists are edited in the data
   file, **Then** the wizard offers the edited options and the wizard still advances to the
   dashboard.
4. **Given** the Reports & Billing screen shows plan tiers, usage limits, team members, and
   invoices across tabbed sections, **When** the data files for those sections are edited,
   **Then** each tab shows the edited records and tab switching still works.

---

### User Story 3 - Shared reference data is defined once (Priority: P3)

The list of monitored AI models is currently written out in at least three separate places, so
adding or renaming a model means finding every copy. Values that describe the same real-world
thing across screens — the monitored AI model list, the tracked competitor set, and the product
category list — should be defined once and referenced everywhere they appear.

**Why this priority**: It removes a class of drift bug rather than a rendering problem, and it
only becomes possible once Stories 1 and 2 have externalized the individual copies.

**Independent Test**: Rename one monitored AI model in the single shared data file, reload, and
confirm the new name appears on every screen that lists models, with no remaining occurrence of
the old name anywhere in the application.

**Acceptance Scenarios**:

1. **Given** the monitored AI model list appears in dashboard filters, chart legends, and model
   status cards, **When** a model is renamed in the shared data file, **Then** the new name
   appears in all of those places from that one edit.
2. **Given** a new AI model is added to the shared list, **When** the application is reloaded,
   **Then** the model appears in every list-driven surface without any component file changing.

---

### Edge Cases

- **A record mixes business data with presentation.** Several records carry an icon reference or
  a theme color next to their business values (competitor entries, stat cards, timeline steps,
  alert severities, model status cards). The business half must move to the data file and the
  icon and color must stay in code, joined back at render time by a stable identifier.
- **Data is declared inside a component body rather than at file top level.** Some lists are
  declared inside the function that renders them, and one wizard step seeds editable state from a
  starting list. Externalizing must not convert editable state into fixed content — the wizard
  must still allow adding and removing entries.
- **Values are generated at runtime.** At least one screen generates chart points from a random
  function using a base and variance. The generating function is logic and stays in code; only
  its inputs are data.
- **A lookup table maps a data value to a presentation value.** Mappings from a value to an icon
  glyph or a color class are presentation rules keyed by data, not data themselves, and stay in
  code.
- **Navigation entries look like data but are not.** The sidebar and mobile navigation entries
  pair a route with an icon. Routes and navigation are explicitly out of scope and must not move.
- **A record is referenced by more than one component.** Where two components render the same
  underlying records, both must read the same data file rather than each getting a copy.
- **A data file is empty or a collection has no entries.** Screens must render their existing
  empty state rather than failing.
- **Repeated UI text.** Short labels stay in components, but a repeated set of option labels
  (filter choices, dropdown options) is a data value and moves.

## Requirements *(mandatory)*

### Functional Requirements

**Inventory and extraction**

- **FR-001**: The system MUST have an exhaustive inventory of every hardcoded business and sample
  data collection in the application, covering at minimum the 53 data collections identified
  across 37 files outside the shared design primitives, and each inventory entry MUST be
  classified as either "move to data file" or "stay in code" with a stated reason.
- **FR-002**: Every collection classified as "move" MUST be relocated into a data file under
  `src/data`, and the original literal MUST be removed from the component or page file.
  *(Covered by the per-feature extraction tasks T009–T087; verified by T095.)*
- **FR-003**: Data files MUST be organized by page or feature, so that a person can locate the
  data behind any screen without searching the whole application.
- **FR-004**: Data files MUST contain only business and sample data values. They MUST NOT contain
  executable code, functions, component references, icon references, colors, class names, font,
  spacing, size, or layout values.
- **FR-005**: Records that currently mix business data with an icon or color MUST retain a stable
  identifier in the data file that the component uses to resolve the correct icon and color, so
  no presentation value is written into a data file.

**What stays in code**

- **FR-006**: Functions, hooks, component state, event handlers, formatting, calculations, and
  all rendering logic MUST remain in the React code.
- **FR-007**: Page titles, button labels, form labels, validation and status messages, and other
  one-off interface text MUST remain in the components. Repeated sets of option labels that
  function as data values MUST move to data files.
- **FR-008**: Navigation entries and route definitions MUST NOT be moved or altered.
- **FR-009**: Presentation lookup tables that map a data value to an icon or a color MUST remain
  in code.

**Behavior preservation**

- **FR-010**: Every screen MUST render the same content it rendered before the change, with no
  visual difference in layout, styling, ordering, or the values displayed.
- **FR-011**: All existing interactions MUST continue to work unchanged, including tab switching,
  master/detail selection, content-type filtering, dropdown selection, sidebar collapse, mobile
  navigation, dialogs, and the wizard's add and remove behavior.
- **FR-012**: No route, URL, or navigation path may change, and no backend, database, or network
  API may be introduced. All data MUST continue to be bundled with the application.
- **FR-013**: The application MUST build and pass its existing static checks with no new errors
  or warnings after the change. *(Covered by T096.)*

**Structure and future readiness**

- **FR-014**: Each data collection MUST have an accompanying declared shape that describes the
  records it holds, defined once and reused by every component that reads that collection, so
  that a mistyped or missing field is caught before the application runs.
- **FR-015**: Shared reference data that describes the same real-world set across multiple
  screens — the monitored AI model list, the tracked competitor set, and the product category
  list — MUST be defined once and referenced by every screen that uses it.
- **FR-016**: Loading data from files MUST be supported by the project's build configuration; any
  configuration change required to enable it is in scope.
- **FR-017**: The demo content MUST remain fictional and unchanged in substance — the same brand,
  competitors, people, and figures — with no real customer data, credentials, or secrets
  introduced. *(Enforced by the "verbatim" requirement on every extraction task; verified by the
  value diffing under SC-002.)*

### Key Entities

Each entity below is a category of sample record currently embedded in the code that becomes an
externally editable collection. Field lists describe what the records represent, not how they are
stored.

- **Visibility Metric**: A headline performance indicator — its name, current value, change
  amount, direction of change, and the series behind its trend line.
- **Time Series Point**: One dated observation of one or more tracked series, used by the share,
  inclusion, sentiment, performance, and impact charts.
- **AI Model**: A monitored assistant — its name, short badge text, health status, time since last
  scan, inclusion rate, and trend direction. Shared reference data.
- **Competitor**: A tracked rival brand — its identifier, display name, badge letter, share of
  voice, average position, sentiment, citation count, and categories led.
- **Category Share**: A product category with each brand's share within it.
- **Citation Source**: An external source that AI answers cite — its title, address, publishing
  domain, and authority level.
- **Alert**: A detected change worth attention — its message, severity, and time.
- **Prompt**: A tracked buyer question — its text, category, buyer intent, region, models it runs
  against, schedule, and latest outcome.
- **Prompt Template**: A reusable starting prompt with its name and description.
- **Scheduled Run**: An upcoming or recent execution — its name, timing, and status.
- **Answer Record**: One AI response — the prompt asked, the model, the full answer, the outcome
  for the brand, brand position, sentiment, run date, region, category, intent, its reasoning
  factors, its cited sources, and any flagged inaccuracies.
- **Content Recommendation**: A prioritized content action — its title, priority, content type,
  rationale, estimated impact, tags, status, and assignee.
- **Content Gap**: A category and content type pairing with its current coverage level.
- **Experiment**: A content change under measurement — its name, hypothesis, status, dates, and
  measured effect on recommendation share and downstream signals.
- **Plan Tier**: A subscription level — its name, price, included limits, and features.
- **Usage Limit**: A metered resource — its name, amount consumed, and allowance.
- **Team Member**: A workspace user — their name, role, access level, and last activity.
- **Invoice**: A billing record — its date, amount, period, and status.
- **Report Type**: An exportable report — its name, description, and cadence.
- **Setup Option**: A selectable choice offered during workspace setup — suggested categories,
  regions, and monitoring frequencies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the data collections classified as "move" in the inventory are relocated,
  and zero multi-record business data literals remain in any page or component file outside the
  documented exclusions.
- **SC-002**: Every one of the ten screens renders identically before and after the change — same
  layout, same styling, same ordering, same displayed values. Verified by two complementary
  means: (a) every extracted collection diffed programmatically against the literal it replaced,
  and (b) a manual walkthrough of each screen at a narrow and a wide viewport. Where no browser
  automation is available, (a) is mandatory and (b) must be recorded as outstanding rather than
  assumed.
- **SC-003**: Any displayed business value can be changed by editing exactly one data file, with
  no code file modified.
- **SC-004**: Renaming a shared reference value once updates every screen that displays that
  value **in the same form**, with zero remaining copies of it in component code. Surfaces that
  deliberately render a different form of the same name — a metrics row labelled "ChatGPT"
  against a run log labelled "ChatGPT-4o" — keep their own value, because unifying them would
  change what renders and breach SC-002.
- **SC-005**: A person unfamiliar with the codebase can locate the data behind any given screen
  element in under one minute, using only the data folder's organization.
- **SC-006**: Every interactive behavior that worked before the change still works after it, with
  zero regressions across tab switching, master/detail selection, filtering, dropdowns, dialogs,
  navigation, and the setup wizard's add and remove actions.
- **SC-007**: The application builds and passes static checks with zero new errors or warnings,
  and no screen displays the runtime error fallback.
- **SC-008**: Zero data files contain executable code, component or icon references, colors,
  class names, or sizing values. *(Verified by T093.)*

## Assumptions

- **The refactor is behavior-neutral by definition.** Where the current code produces an odd
  result, the odd result is preserved; correcting business data or fixing latent bugs is out of
  scope and would be raised separately.
- **Users of this feature are the development and demo team**, not end users of GapVisor. The
  application's own users see no change whatsoever.
- **"Data" means values that describe the fictional business domain** — metrics, records, option
  sets, and sample content. Interface chrome, one-off text, and anything governing appearance is
  not data for this purpose, per the explicit exclusions in the request.
- **Repeated option label sets count as data.** Filter choices and dropdown option lists move,
  while a single button or heading label stays, following the request's "unless they are repeated
  data values" rule.
- **Declared record shapes accompany the data files rather than living inside them**, since data
  files hold values only. This satisfies the project constitution's requirement that every
  dataset carry an explicit type describing the shape a future API would return.
- **The project's build configuration does not currently permit loading JSON data files.**
  Enabling this is a prerequisite of the feature and is treated as in scope under FR-016.
- **No test suite exists in the project**, so behavior preservation is verified by building the
  application and reviewing each screen against its current rendering, per the constitution's
  quality gates.
- **The `src/components/ui/` design primitives are out of scope.** They are third-party-derived
  component code containing no business data.
- **Navigation entries stay in code** even though they are list-shaped, because routes and
  navigation are explicitly excluded by the request.
- **This work directly discharges the Principle II debt** recorded in the project constitution
  for the Answer Analysis, Competitor Intelligence, and Content Recommendations screens.
