# Single-Dog Walk Timing and Trends — Design

**Date:** 2026-08-09
**Status:** Approved in conversation; awaiting written-spec review

## Goal

Orient DogWalk Visualizer around one editable dog profile, Dozer, while making
each individual walk a time-based record. Support multiple walks per day and
show when walks happen, how long they last, and how Dozer's routine changes over
time.

The result remains a local-first Tauri desktop app backed by SQLite. A later
MariaDB/API/multi-device project is explicitly separate from this work.

## Product Decisions

- The product presents one dog, not a selectable pack.
- First-run onboarding is titled **Set up Dozer**. The saved name and other
  profile fields remain editable; `Dozer` is not hard-coded into stored data.
- A day may contain any number of walks, but an exact duplicate date and start
  time is rejected as an accidental duplicate.
- Every new walk requires a date, local start time, duration, and distance.
  Notes and behavior rating are optional.
- The start time defaults to the current local time. End time is derived from
  start time plus duration and is not stored separately.
- The primary analytics view is a Walk Rhythm map. A Weekly Pattern view is a
  sibling tab.
- Analytics ranges are 4 weeks, 12 weeks, 1 year, and all time. The default is
  12 weeks.
- Weekly Pattern supports duration, distance, and walk-count metrics.
- Insights are deterministic local calculations, not AI-generated text and not
  medical advice.
- The existing small set of records will not be carried into the redesigned
  experience. The user will explicitly use the existing confirmed Clear All
  Data action before moving to the new build.

## Single-Dog Experience

The database retains the `dogs` table and `dog_id` relationships, but the
application enforces a single-profile invariant at the UI and store boundaries.
This preserves a useful domain boundary for backups and a later service-backed
architecture without exposing multi-dog controls.

When no dog exists, the app shows a focused **Set up Dozer** form. After setup:

- The dashboard always loads that profile.
- The dog selector and **New dog** action are removed.
- Profile editing moves to a clearly labeled Dozer Profile area.
- Walks and goals are implicitly scoped to the one stored profile.
- The store exposes singular profile behavior rather than creation/selection
  modes, even if low-level database helpers continue returning rows.

The application must surface an explicit error if it encounters more than one
dog after the reset instead of silently choosing one. This protects the
single-dog invariant and avoids hiding records.

## Walk Data Model

Each current walk contains `date`, optional `duration_minutes`, distance, and
notes, and the schema enforces one row per dog per date. The new walk contract is:

| Field | Storage | Requirement |
| --- | --- | --- |
| `id` | Integer primary key | Generated |
| `dog_id` | Integer foreign key | Required |
| `date` | `YYYY-MM-DD` text | Required |
| `start_time` | `HH:MM` local-time text | Required |
| `duration_minutes` | Positive integer | Required |
| `distance_km` | Positive real | Required; canonical metric storage remains unchanged |
| `behavior_rating` | Nullable enum text | Optional |
| `notes` | Nullable text | Optional |
| `created_at` | Timestamp text | Generated |

Date and local time remain separate. These values describe Dozer's local daily
routine without inventing cross-device timezone behavior before synchronization
exists. A future service design can add absolute timestamps and zone metadata if
multi-device use requires them.

`behavior_rating` accepts only:

- `difficult` — 😣 Difficult
- `unsettled` — 😕 Unsettled
- `good` — 🙂 Good
- `great` — 😄 Great

Rows are ordered by date descending, start time descending, then ID descending.
A uniqueness constraint on `(dog_id, date, start_time)` rejects an exact
same-minute duplicate. Creation surfaces this conflict and never upserts or
overwrites an existing walk.

## SQLite Migration and Fresh Start

Migration v1 must not be edited. Add a versioned migration that uses static,
parameter-free DDL and does not delete user records.

SQLite cannot remove the existing table-level unique constraint in place. To
respect the repository's non-destructive migration policy, the migration will:

1. Rename the existing `walks` table to `walks_legacy`.
2. Create the new `walks` table with the revised required fields and the
   `(dog_id, date, start_time)` uniqueness constraint.
3. Add an index supporting dog/date/time retrieval.

No legacy rows are copied because the approved experience starts fresh, but the
old table remains available rather than being dropped. The user must run the
existing confirmed Clear All Data action before installing/running the new
build so the dog profile and goal tables also return to onboarding state. The
clear-data implementation will cover both the active and legacy walk tables
when present.

This migration adds no Tauri capability and no network, shell, or remote-asset
permission. All SQL remains parameterized in the application layer.

## Walk Entry and History

The Add Walk form keeps the current compact workflow and adds only the fields
needed for accurate analytics:

- Date defaults to today.
- Start time defaults to the current local time, rounded to minute precision.
- Duration remains expressed in whole minutes and becomes mandatory.
- Distance remains mandatory and follows the existing US/metric display
  conversion boundary.
- A four-option emoji picker appears immediately above Notes. It defaults to no
  selection and includes visible text labels and accessible pressed/selected
  state.
- Notes remain free text and do not encode the behavior value.

After a successful create, date resets to today, start time resets to the then-
current local time, and the other sensible defaults are restored. On failure,
the user's entered values remain available for correction.

History renders every walk independently. Each row shows date, start time,
duration, distance, and the behavior emoji and label when set. Editing or
deleting one walk must not affect another walk on the same date.

## Dashboard Structure

The existing weekly goals and walked-today behavior remain visible. A new
range-aware Analytics panel sits below the weekly summary and owns:

- A shared 4-week / 12-week / 1-year / all-time range selector.
- Compact selected-range summaries for walk count, total duration, total
  distance, and current streak.
- Walk Rhythm and Weekly Pattern tabs.
- A small deterministic Insights area.

### Walk Rhythm

Walk Rhythm is the default tab:

- Horizontal position represents calendar date.
- Vertical position represents local start time.
- Marker size represents duration.
- Marker styling uses the existing visual language and remains readable without
  relying on behavior color alone.
- A tooltip shows date, exact start time, duration, display-unit distance,
  behavior emoji/label, and notes when present.

The view should reveal recurring morning and evening clusters, changes in walk
timing, two-walk days, and whether longer walks tend to happen at a particular
time.

### Weekly Pattern

Weekly Pattern groups Monday-through-Sunday weeks into four local-time periods:

- Morning: 4:00 AM–11:59 AM
- Midday: 12:00 PM–3:59 PM
- Evening: 4:00 PM–9:59 PM
- Night: 10:00 PM–3:59 AM

Stacked bars show the contribution of each period. A compact toggle changes the
metric among:

- Duration in minutes
- Distance in the selected display unit
- Number of walks

The selected range is shared with Walk Rhythm so changing tabs does not reset
the user's context.

## Analytics and Generated Observations

Analytics remain pure TypeScript functions over the loaded walk records. The
small local dataset does not justify moving aggregation into SQL. The component
layer receives display-ready series and sentences but does not implement
business calculations.

Range definitions are inclusive of today:

- 4 weeks: 28 calendar days
- 12 weeks: 84 calendar days
- 1 year: 365 calendar days
- All time: earliest active walk through today

For finite ranges, period-over-period comparisons use the immediately preceding
range of the same length. All time omits percentage-change claims because it has
no equivalent preceding range.

Candidate observations include:

- Dozer's most common walk period.
- Average morning duration compared with average evening duration.
- Change in the currently selected duration, distance, or walk-count metric
  from the preceding equivalent period.
- Whether the routine is clustering more consistently around a time window.

General pattern statements require at least five walks. Period-over-period
statements require at least three walks in both the current and preceding
periods. When thresholds are not met, the UI states that more walks are needed
instead of presenting unstable conclusions. Ties and zero denominators use
plain, non-percentage wording.

Behavior appears in entry, history, and rhythm-tooltip contexts in this scope.
Behavior-specific charts and generated behavior trends are deferred.

## Component and Data Boundaries

- `WalkForm` owns form validation and maps display values to the storage
  contract.
- A focused `BehaviorPicker` owns the optional four-value selection UI.
- `WalkRhythmChart` renders individual time-based points.
- `WeeklyPatternChart` renders weekly period buckets and the metric toggle.
- `AnalyticsPanel` owns range selection, tab selection, summaries, and insight
  presentation.
- A focused analytics module owns range filtering, summaries, rhythm points,
  weekly buckets, and deterministic observations.
- The Zustand store owns asynchronous load/save/delete orchestration and the
  single-profile invariant, but not analytics math.
- `db.ts` owns parameterized SQLite access and maps database rows to typed
  records.

These boundaries keep analytics independently testable and avoid expanding the
already broad dashboard component with calculation logic.

## Error and Empty States

- Invalid or missing date, time, duration, and distance produce field-level
  messages and prevent submission.
- An exact date/time duplicate produces a specific status message and preserves
  the form values.
- Unknown behavior values imported or read from storage are treated as invalid
  data and surfaced rather than silently mapped to a valid emoji.
- Database errors continue through the existing visible dashboard error/status
  paths.
- Empty ranges show a focused invitation to log walks.
- Sparse ranges show charts when possible but suppress unsupported observations.
- Chart tooltips and controls remain keyboard reachable and do not convey
  meaning by color alone.

## Backup Compatibility

Exports include `start_time` and `behavior_rating` as part of each active walk
row and add `schema_version: 2` at the payload root. This makes the expanded
shape explicit for the future importer and prevents older payload assumptions
from silently discarding the new fields.

Import is not part of the current application and is not added by this work.
The future MariaDB project will define its own explicit importer from the
versioned local export shape.

## Testing and Verification

### Rust and migration

- Migration uses static DDL and contains no `DROP`, `DELETE`, `ATTACH`, or
  dynamic SQL.
- The new schema allows multiple walks on one date.
- The new schema rejects an exact dog/date/start-time duplicate.
- Required and behavior-check constraints reject invalid rows.
- Existing migration tests remain intact; migration v1 is unchanged.

### Pure TypeScript analytics

- Morning, midday, evening, night, and midnight boundaries.
- Multiple same-day walks remain independent.
- 28-day, 84-day, 365-day, and all-time filtering.
- Monday-start weekly grouping.
- Duration, metric distance, and count aggregation.
- Immediately preceding equivalent-period comparisons.
- Minimum-evidence thresholds, ties, and zero denominators.
- Rhythm points preserve exact local date/time and behavior metadata.

### UI behavior

- Set up Dozer onboarding and single-profile invariant.
- No dog selector or new-dog action after setup.
- Start time defaults to now and remains editable.
- Duration, distance, date, and time are required.
- Behavior picker works with pointer and keyboard input and exposes readable
  labels.
- Two walks on one day can be created, displayed, edited, and deleted
  independently.
- Range, tab, and metric selections update the correct chart and summaries.
- Sparse and empty states render without chart errors.

### Completion checks

- `npm test`
- `npm run build`
- `cargo fmt --check` from `src-tauri/`
- `cargo test` from `src-tauri/`
- `cargo check` from `src-tauri/`
- Manual responsive browser verification of both analytics tabs and the walk
  form at desktop and mobile-sized widths

## Out of Scope

- MariaDB, an API service, authentication, remote access, synchronization, and
  conflict resolution
- Network or shell capabilities
- Preserving or inferring times for the current small walk history
- Multiple dog profiles in the UI
- Separate end-time entry
- GPS tracking or maps
- AI/LLM-authored observations
- Medical, veterinary, or prescriptive health claims
- Behavior-specific charts or long-term behavior analysis
- User-configurable time-period boundaries

## Future MariaDB Boundary

The retained `dogs`/`walks`/`goals` relationships, explicit local date/time,
structured behavior value, and versioned backup shape make later export easier.
They do not constitute a synchronization design. The future project must decide
authentication, stable cross-device identifiers, canonical timestamps and time
zones, API ownership, conflict handling, and deployment before replacing local
SQLite behavior.
