# HackCollab — Architecture, Decisions & Roadmap

> A structured collaboration platform for Hack Club members to post projects, find collaborators, form teams, and ship together.

---

## Table of Contents

- [Core Problem](#core-problem)
- [Critical Failure Modes](#critical-failure-modes)
- [Key Design Decisions](#key-design-decisions)
- [Auth & Security Architecture](#auth--security-architecture)
- [Threat Model](#threat-model)
- [Database Schema](#database-schema)
- [UX & Behavioral Architecture](#ux--behavioral-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Strategic Analysis](#strategic-analysis)
  - [Official vs. Unofficial Status](#1-official-vs-unofficial-status)
  - [Governance Risks](#2-governance-risks)
  - [Infrastructure Positioning](#3-infrastructure-positioning)
  - [Scalability Challenges](#4-scalability-challenges)
  - [Long-Term Roadmap](#5-long-term-roadmap)
  - [Expansion Beyond Hack Club](#6-expansion-beyond-hack-club)
  - [Monetization Risks](#7-monetization-risks)
- [Open Questions](#open-questions)

---

## Core Problem

Student hackers face coordination costs that exceed the cost of building alone. The platform must reduce these costs below the collaboration threshold — making it easier to find and work with a teammate than to build solo.

## Critical Failure Modes

Ranked by severity:

1. **Ghost projects** — Cheap to post, expensive to maintain. The feed becomes a graveyard of abandoned ideas.
2. **Low-commitment contributors** — No cost to apply, no reputation consequence for flaking.
3. **Idea-to-builder imbalance** — 10x more idea-posters than builders. Builders are the scarce resource.
4. **Low-quality posts** — Vague, unscoped, no evidence of thought or commitment.
5. **Platform abandonment** — Hype-driven launch, no sustained daily value.

## Key Design Decisions

- **Optimize for builders** (the scarce resource), while remaining accessible to project creators
- **Project lifecycle model** — States (draft → recruiting → active → completed/archived), not static posts
- **Visible history as primary incentive** — Completed vs. abandoned projects, peer sentiment
- **No built-in messaging** — Leverage Hack Club Slack; the platform handles matching & structure
- **Structured data from day one** — Skills, availability, preferences to support future matching
- **Hack Club Slack as primary auth**, GitHub as optional enrichment
- **Lightweight community moderation** with curator fallback

---

## Auth & Security Architecture

### Authentication

- **Single auth provider**: Hack Club OIDC only. No fallback login. Unauthenticated read for public content.
- **GitHub**: Optional linking, read-only, minimal scopes. Store `user_id` not username. No long-lived token storage.
- **No DMs**: All communication through Hack Club Slack channels.

### Sessions

- **Server-side sessions**: Opaque cookie, `HttpOnly`/`Secure`/`SameSite=Strict`. No JWTs in cookies.
- **Session TTL**: 14-day absolute max, 4-hour idle timeout (with "remember me" opt-in for longer idle). Sliding window.
- **Revocation**: Immediate on logout/ban. Membership loss caught at re-auth (14-day gap max).

### Membership & Roles

- **Membership loss**: Soft-disable account, preserve data, block actions. Reactivatable.
- **PII**: Minimize aggressively. No real names, addresses, birthdates, or school names stored.
- **Role enforcement**: App layer (auth middleware + business logic) + DB layer (RLS as defense-in-depth).
- **Roles**: Relationship-based (owner/member/applicant per project) + platform roles (admin/moderator) separate.
- **Content safety**: Server-side sanitization. Markdown → sanitized HTML (strict allowlist). No file uploads at MVP.

## Threat Model

| ID | Threat | Mitigation |
|----|--------|------------|
| T1 | Session hijacking on shared computers | Short idle TTL, HttpOnly cookies |
| T2 | CSRF on state-change actions | SameSite=Strict + CSRF tokens |
| T3 | XSS via user content | Server-side sanitization, no raw HTML |
| T4 | PII exposure / COPPA | Aggressive PII minimization |
| T5 | Predatory contact | No DMs, HC membership gate, moderation |
| T6 | OAuth state fixation | Cryptographic nonce |
| T7 | IDOR / privilege escalation | RLS + app-layer checks |

---

## Database Schema

**File**: `supabase/migrations/00001_initial_schema.sql`

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Platform profiles linked to Supabase Auth |
| `projects` | Project listings with lifecycle state |
| `project_roles` | Open positions on projects (e.g., "frontend dev") |
| `applications` | Builder applications to specific roles |
| `members` | Active team memberships |

### Enums

`platform_role`, `project_status`, `application_status`, `availability`, `membership_status`

### Security Functions

- **`fill_project_role`**: Atomic role acceptance with `SELECT ... FOR UPDATE` to prevent race conditions
- **`apply_to_role`**: Business rule validation (max 3 memberships, can't apply to own project, etc.)
- **`create_project`**: Rate-limited (10-min cooldown, max 5 active projects per user)
- **`auto_archive_stale_projects`**: 14-day stale warning, 21-day auto-archive via pg_cron

### Safeguards

- Full RLS policies on all 5 tables + anonymous read access for public content
- Materialized view `project_summary` for the discovery feed
- Anti-spam: 10-min cooldown on project creation, max 5 active projects, max 3 active memberships

---

## UX & Behavioral Architecture

### Onboarding

3-tier progressive disclosure:
- **Tier 0**: Login, browse projects (zero friction)
- **Tier 1**: Skills + availability (just-in-time, triggered on first action like applying)
- **Tier 2**: GitHub link, bio (optional, never required)

### Anti-Ghosting

Activity heartbeat → 14-day stale nudge → 21-day auto-archive. Easy, guilt-free exits for team members.

### Anti-Idea-Dumping

4-step creation wizard (commitment escalation), `first_milestone` required, draft auto-delete at 7 days.

### Moderation

No pre-moderation. Structural quality gates + post-hoc community flagging (3 flags → auto-hide → admin review).

### Application Flow

Single open-text pitch (20–2000 chars), auto-populated context from profile, visible membership cap.

### Metrics & Gamification

- Implicit health signals shown (recency, response rate, team size). **No** computed scores, **no** leaderboards, **no** streaks.
- Gamification rejected for volume/engagement. Accepted only for outcomes (completion markers, team acknowledgment).

### Notifications

Slack DMs only: applications received, application status changes, weekly skill-matched digest, stale warnings. Nothing else.

### Anti-Burnout

Max 3 memberships, availability as a first-class concept, easy exits, no streaks, celebrate completion over activity.

### Retention Loops

1. **Builder discovery** (weekly digest of matching projects)
2. **Creator engagement** (per-project lifecycle nudges)
3. **Social proof** (emergent from visible completion history)

---

## Frontend Architecture

### Stack

- **Next.js 15** (App Router, `src/` directory)
- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **shadcn/ui pattern** (Radix UI primitives + CVA + tailwind-merge, manually implemented)
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`)
- **Hack Club OIDC** via Supabase Auth (configured as `keycloak` provider)
- **Deployment target**: Vercel

### Theme

All Hack Club design tokens (`@hackclub/theme`) extracted as CSS custom properties and mapped to Tailwind v4's `@theme` system. Dark/light mode via class strategy (`.dark`) with `ThemeProvider` + anti-flash script. Phantom Sans typeface self-hosted with `system-ui` fallback.

### Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Dynamic | Public landing page |
| `/login` | Static | Sign in with Hack Club |
| `/auth/callback` | Dynamic | OAuth code exchange |
| `/auth/error` | Static | Auth error display |
| `/dashboard` | Dynamic | User's projects, teams, applications |
| `/projects` | Dynamic | Discovery feed / browse projects |
| `/projects/[id]` | Dynamic | Project detail with roles & team |
| `/projects/new` | Dynamic | 4-step project creation wizard |
| `/profile` | Dynamic | User profile with skills & history |

### Middleware

Protects `/dashboard`, `/projects/new`, `/profile`. Redirects unauthenticated users to `/login?next=...`. Redirects authenticated users away from `/login`.

### Components

- **Header** (server component) + **UserNav** (client component with dropdown)
- **UI primitives**: Button (with HC-themed variants including `cta` gradient), Card, Badge, Input

---

## Strategic Analysis

### 1. Official vs. Unofficial Status

**Stay unofficial for 0–12 months. Pursue endorsement (not integration) at 12–18 months.**

- HC staff are a bottleneck (~20-30 people). Getting on their roadmap means competing with Bank, Arcade, Days of Service.
- Unofficial tools that gain organic traction get adopted — this is the HC pattern (Scrapbook, Slack bots).
- Official status creates obligations (accessibility audits, code review, content policy alignment) that consume dev bandwidth early.
- The HC OIDC dependency already provides deep integration at the auth layer.
- **Risk of going official too early**: HC leadership could impose requirements or fork the concept with more resources.
- **The move at 12–18 months**: Approach with 200+ active users and 50+ completed projects. Frame as "this already exists and people use it" — not "can we build this."

### 2. Governance Risks

**Bus factor of 1 is the top risk.**

- **Single maintainer**: If you lose interest, graduate, or get busy — the platform dies. Get 2–3 co-maintainers with production access (Supabase, Vercel) within 3 months. Write a runbook.
- **Moderation power asymmetry**: One perceived unfair action can generate Slack drama overnight. Mitigate with transparent moderation log (anonymized), appeal process, and published content policy.
- **Data stewardship**: Accounts linked to HC identities require a published privacy policy and incident response plan, even with PII minimization.
- **HC direction changes**: If HC launches a competing feature, your platform could become redundant overnight. Build value orthogonal to HC's core (persistent team infrastructure vs. events/education).

### 3. Infrastructure Positioning

| Side Project | Infrastructure |
|---|---|
| "Check out this cool thing I built" | "Here's where teams form" |
| Lives on personal GitHub | Dedicated org, docs, contributor guide |
| Goes down when you're busy | Uptime monitoring, incident response |
| One deployment environment | Staging + production, CI/CD |
| You are the brand | The platform is the brand |

**Steps to cross the threshold:**
1. Dedicated GitHub org (not personal repo)
2. Status page (Instatus, Upptime — even a free one)
3. `CONTRIBUTING.md` + architecture docs
4. Semantic versioning for schema migrations
5. Platform identity separate from personal identity
6. **Uptime > features** — prove 99.5% uptime for 3 months before adding features

### 4. Scalability Challenges

Current architecture handles **~1,000 users**. Problems emerge at **2,000–5,000**:

| Challenge | Trigger Point | Mitigation |
|-----------|---------------|------------|
| DB connection limits | ~1000 concurrent | PgBouncer (Supabase includes this) |
| Materialized view refresh | 10K+ projects | Off-peak refresh scheduling |
| Discovery feed noise | 500+ projects | Weighted ranking (recency × vacancy × creator history) |
| Moderation scaling | 2000+ users | Weight flags by flagger reputation (trusted flaggers count 2x) |
| Slack notification volume | 2000+ users | Batch sends, rate limit respect, digest frequency reduction |
| HC OIDC as single point of failure | Any outage | Graceful degradation — cached public content, "login unavailable" message |

### 5. Long-Term Roadmap

#### Phase 1: 0–6 Months — "Prove It Works"

**Goal**: 50 active users, 20 projects with team members, 5 completed projects.

- Wire Supabase queries to all page scaffolds
- Deploy to Vercel with real Supabase + HC OIDC
- Recruit 10 beta users from HC Slack (manually, in relevant channels)
- Soft launch in `#ship`
- Fix every bug within 24 hours
- Privacy-respecting analytics (Plausible or Umami)
- Establish 2 co-maintainers
- **Do NOT add features.** The create → recruit → build → complete loop must work end-to-end first.

#### Phase 2: 6–18 Months — "Become Default"

**Goal**: 300+ active users, recognized as the answer to "how do I find collaborators" in HC Slack.

- Skill-based matching recommendations (weekly digest)
- Project completion celebrations (auto-post to `#ship`)
- GitHub repo linking with activity signals
- Text search + filters (schema supports `pg_trgm`)
- Seek HC endorsement
- Mobile-responsive polish
- Public API for Slack bot integration
- Contributor pipeline from HC community

#### Phase 3: 2+ Years — "Infrastructure Layer"

**Goal**: Platform is how HC teams form. Community-maintained.

- Hackathon integration (time-boxed team formation for event organizers)
- Cross-project skill graph
- Alumni mentorship layer
- Potential federation with other youth coding orgs
- Formal governance (elected moderators, transparent decisions)
- Community ownership with documented handoff

### 6. Expansion Beyond Hack Club

**Viable in theory, dangerous in practice. Not before 18 months.**

**Why it's tempting**: Collaboration matching is universal. Architecture is provider-agnostic at the data layer. TAM expands 100x.

**Why it's dangerous**:
- **Identity dilution**: HC membership is the trust layer. Remove it and you become a generic team-finding tool.
- **Community mismatch**: HC (13–18, intrinsic motivation) vs. MLH (18–22, often resume-driven) — culture clashes the platform isn't designed for.
- **Auth complexity explosion**: Multiple OAuth flows, account linking, identity conflicts.
- **Moderation scope explosion**: Without HC's membership gate, you need real content moderation infrastructure.

**If expansion happens**: Federation (separate instances per community, shared codebase, separate user pools) — never generalization.

### 7. Monetization Risks

**Extreme caution required in a nonprofit-aligned ecosystem.**

**What you cannot do:**
- Charge users (teenagers, many without income)
- Show ads (instant credibility death)
- Sell data (legal and ethical nuclear option)
- Offer premium tiers (creates class division)
- Accept VC funding (misaligned incentives)

**What's viable:**
- **Open Collective / GitHub Sponsors** for hosting costs (transparent, community-funded)
- **HC grants** (most aligned funding source)
- **Vercel/Supabase OSS sponsorships** (free infrastructure)
- **In-kind infrastructure donations**

**The sustainable model**: This should cost <$50/month at 1,000 users (Supabase Pro + Vercel Pro). That's fundable through a single GitHub Sponsor or HC grant. Optimize for cost minimization, not revenue. If costs stay under $100/month, monetization is a non-problem.

---

## Open Questions

1. Does Hack Club's IdP support webhooks for membership revocation?
2. Target MVP audience size? (50 vs 500 changes discovery vs matching priority)
3. Existing project-posting behavior in Slack? (must beat current workarounds)
4. COPPA compliance: handled by Hack Club at membership level, or do we need our own?

---

## File Tree (current)

```
src/
├── app/
│   ├── auth/callback/route.ts    # OAuth code exchange
│   ├── auth/error/page.tsx       # Auth error page
│   ├── dashboard/page.tsx        # User dashboard
│   ├── login/page.tsx            # Login page
│   ├── profile/page.tsx          # User profile
│   ├── projects/
│   │   ├── [id]/page.tsx         # Project detail
│   │   ├── new/page.tsx          # Creation wizard
│   │   └── page.tsx              # Discovery feed
│   ├── globals.css               # HC theme tokens + Tailwind config
│   ├── layout.tsx                # Root layout
│   ├── not-found.tsx             # 404
│   └── page.tsx                  # Landing page
├── components/
│   ├── header.tsx                # Navigation (server)
│   ├── theme-provider.tsx        # Dark/light mode
│   ├── ui/
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   └── user-nav.tsx              # User dropdown (client)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── middleware.ts         # Session refresh helper
│   │   └── server.ts            # Server Supabase client
│   └── utils.ts                  # cn() utility
└── middleware.ts                  # Route protection

supabase/
└── migrations/
    └── 00001_initial_schema.sql  # Full database schema
```
