I've read through the whole app (shell, all components, store, stats, db, units, image). Overall: it's in good shape — clean separation, parameterized SQL, tested pure stats functions, thoughtful empty states. The suggestions below are ordered by how much they'd matter to you as the app's one user: a real date bug first, then UX papercuts, then design direction.

## Bugs worth fixing

1. Evening walks get logged as "tomorrow" — stats.ts:12-14. todayIso() uses new Date().toISOString(), which is UTC. If you're anywhere west of UTC (the "us" units default suggests you are), then from ~5–8pm local time onward, todayIso() returns tomorrow's date. That skews everything downstream: the walk form's default date, the "Walked today" chip, the streak, and the chart's last day. The fix is to build the ISO string from local year/month/day (getFullYear/getMonth/getDate) while keeping the existing UTC arithmetic for date math — those are two different concerns and only the first is wrong.

2. Failed writes look like successes. In DashboardShell.tsx:320-324, delete fires void removeWalk(walk.id) and immediately sets "Walk deleted" before the DB call resolves. Similarly, editing a walk's date to a day that already has a walk hits the UNIQUE(dog_id, date) constraint — updateWalk (unlike createWalk) has no upsert — and the rejection is silently swallowed by the form handler with no message. A try/catch around the store actions with an error status would cover both.

3. New-dog selection can pick the wrong dog — appStore.ts:135-140. After insert, the store re-finds the created dog by matching name + breed. Two dogs with the same name (or a name collision after the fallback dogs[dogs.length - 1], which is sorted alphabetically, not by insertion) selects the wrong one. db.execute() returns lastInsertId from the SQL plugin — use that instead.

## UX papercuts
- Status messages never clear. "Walk logged" sits in the header forever. A small auto-dismissing toast (setTimeout ~4s) would feel much better and free up header space.
- Delete is instant with no confirm or undo. Cheapest fix: a two-tap confirm on the button itself ("Delete" → "Really?"), or a 5-second undo in the status toast.
- No true quick-add. CLAUDE.md describes "Quick Add," but there's no one-tap path — the form has defaults, but you still have to reach it and click. Since the upsert already makes this safe, a prominent "Log today's walk" button (using your most recent walk's duration/distance as the values) would make the daily habit a single click.
- Duplicate dog switchers. The header nav (DashboardShell.tsx:160-195) and the chip row inside DogProfileForm (DogProfileForm.tsx:159-185) are the same control twice on the same screen. Keep the header one (it has the photos concept from your recent commit — actually the profile one has the avatars; consolidate avatars into the header nav and drop the inner row).
- Raw ISO dates in walk history ("2026-08-02"). A friendly format like "Sat · Aug 2" scans much faster, and grouping the list by week would reinforce the app's weekly framing.
- Notes is a single-line input — a small auto-growing textarea suits notes better.
- Settings on the onboarding screen includes "Clear all data" — an odd thing to offer someone with zero data. The onboarding screen only really needs the theme/units toggles.
- The km-per-kg "insight" (HealthInsights.tsx:126-131) is an opaque number (~0.043 mi/lb) that doesn't tell you anything actionable. Either drop it or replace it with something legible, like average active minutes per day this week.

## Design direction

The current look — moss/soil/trail palette, soft radial gradient, rounded translucent panels — is cohesive and pleasant. Two things would elevate it from "nice generic dashboard" to something with a point of view:

1. Make consistency the hero, not distance. The spec says the app's job is visualizing weekly consistency, but the centerpiece is a 14-day distance bar chart — distance is the wrong lead metric for a habit app. The signature element I'd build: a consistency grid — rows of weeks, seven cells Mon–Sun, each cell filled by whether you walked (and tinted deeper when the day contributed to a met weekly goal), à la a contribution graph but in your moss/trail palette. Eight to twelve weeks of history at a glance answers "are we keeping the habit?" instantly, which is the question the app exists for. The bar chart can stay as a secondary view or a toggle. All the data plumbing already exists in buildDistanceSeries — this is mostly a new pure function in stats.ts plus a component, following your existing tested-pure-function pattern.

2. Fix the theme system's blind spot: error/danger colors. Delete buttons, error text, and the DB-error card use raw Tailwind reds (red-50, red-700, red-200) — which both violates the project's own "use CSS vars, not raw color classes" rule and breaks in dark mode (hover:bg-red-50 on a dark panel, text-red-700 at poor contrast on #141814). Add --color-danger / --color-danger-soft to both themes in index.css and sweep the ~8 usages.

## Smaller design notes:

- Typography is the flattest part of the identity: Segoe UI reads as "unstyled Windows app." Since this is Tauri with no network, bundle a font via @fontsource/ */(it ships in the build, fully offline). Something warm and slightly rounded for headings — e.g. Bricolage Grotesque or Fraunces — over your existing body stack would give the app a face without touching layout. You're already using tabular-nums on stats, which is the right instinct.
- The banner image occupies prime space on the dashboard (h-32/h-40 even in compact mode) and pushes the actual data down. It's lovely on onboarding — keep it there full-size, and on the dashboard either drop it or shrink it into a header backdrop strip.
- Streak deserves a bit more celebration — it's the emotional core of a habit tracker. Even just a paw emoji + "best: N days" (a computeBestStreak alongside the existing one) makes it feel like a record you're defending, and a subtle scale-in on increment (guarded by prefers-reduced-motion) is the one animation moment I'd spend.

### Accessibility: dog chips should carry aria-pressed, and most buttons rely on default focus outlines while inputs got custom focus rings — add a consistent focus-visible:ring-2 to the button styles.