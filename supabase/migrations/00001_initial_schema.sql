-- ============================================================================
-- HackCollab — Initial Schema
-- Supabase / Postgres 15+
-- ============================================================================
-- Architectural context (from prior analysis):
--   • Hack Club OIDC is the sole auth provider (Supabase Auth handles this)
--   • GitHub is optional profile enrichment, not an auth path
--   • Relationship-based authorization: owner/member/applicant *per project*
--   • Platform roles (admin, moderator) are separate from project roles
--   • RLS as defense-in-depth behind application-layer auth
--   • PII-minimized: no real names, addresses, birthdates stored
--   • Project lifecycle: draft → recruiting → active → completed → archived
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- trigram indexes for search


-- ============================================================================
-- 1. ENUMS
-- ============================================================================
-- Using Postgres enums for type safety on finite, rarely-changing value sets.
-- If a value set changes frequently, use a lookup table instead.

create type platform_role as enum ('member', 'moderator', 'admin');

create type project_status as enum ('draft', 'recruiting', 'active', 'completed', 'archived');

create type application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

create type availability as enum ('under_5h', '5_to_10h', '10_to_20h', 'over_20h');

create type membership_status as enum ('active', 'inactive', 'removed');


-- ============================================================================
-- 2. USERS
-- ============================================================================
-- Linked 1:1 to Supabase Auth (auth.users) via id.
-- PII-minimized: display_name comes from Hack Club OIDC. No real name, no
-- address, no birthdate, no school name.

create table public.users (
    id              uuid primary key references auth.users(id) on delete cascade,
    display_name    text not null check (char_length(display_name) between 1 and 100),
    avatar_url      text check (avatar_url ~* '^https://'),
    bio             text check (char_length(bio) <= 500),

    -- GitHub enrichment (optional linking, not auth)
    github_user_id  bigint unique,               -- immutable GitHub user ID, not username
    github_username text,                         -- cached for display; may go stale

    -- Structured data for matching (designed for future recommendation engine)
    skills          text[] not null default '{}' check (array_length(skills, 1) is null or array_length(skills, 1) <= 20),
    availability    availability,

    -- Platform role
    platform_role   platform_role not null default 'member',

    -- Account state (soft-disable on HC membership loss)
    is_active       boolean not null default true,

    -- Anti-spam: rate-limit project creation
    -- Enforced by trigger, not just application code
    last_project_created_at timestamptz,

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Search by display name (trigram for partial/fuzzy match)
create index idx_users_display_name_trgm on public.users using gin (display_name gin_trgm_ops);

-- Filter by skills (GIN index on array column)
create index idx_users_skills on public.users using gin (skills);

-- Filter active users
create index idx_users_active on public.users (is_active) where is_active = true;

comment on table public.users is 'User profiles. 1:1 with auth.users. PII-minimized.';
comment on column public.users.github_user_id is 'Immutable GitHub user ID from optional account linking. Never use username as key.';
comment on column public.users.skills is 'Self-reported skills for project matching. Max 20.';


-- ============================================================================
-- 3. PROJECTS
-- ============================================================================
-- Central entity. Lifecycle: draft → recruiting → active → completed → archived.
-- "Ghost project" mitigation: last_active_at tracks real activity, used by
-- auto-archive cron. stale_notified_at prevents spamming the owner.

create table public.projects (
    id                  uuid primary key default gen_random_uuid(),
    owner_id            uuid not null references public.users(id) on delete cascade,

    title               text not null check (char_length(title) between 5 and 200),
    description         text not null check (char_length(description) between 50 and 5000),
    tech_stack          text[] not null default '{}' check (array_length(tech_stack, 1) is null or array_length(tech_stack, 1) <= 15),
    max_members         int not null default 5 check (max_members between 2 and 20),

    -- Lifecycle
    status              project_status not null default 'draft',

    -- Required first milestone (anti-vaporware gate)
    first_milestone     text not null check (char_length(first_milestone) between 10 and 500),

    -- Communication channel (Slack channel URL or similar)
    slack_channel_url   text check (slack_channel_url ~* '^https://'),

    -- GitHub repo link (optional)
    repo_url            text check (repo_url ~* '^https://github\.com/'),

    -- Ghost-project detection
    last_active_at      timestamptz not null default now(),
    stale_notified_at   timestamptz,              -- when we last warned the owner about inactivity

    -- Weekly time commitment expected from contributors
    time_commitment     availability not null,

    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- Owner lookup
create index idx_projects_owner on public.projects (owner_id);

-- Primary discovery query: status + recent activity
create index idx_projects_status_active on public.projects (status, last_active_at desc)
    where status in ('recruiting', 'active');

-- Tech stack search
create index idx_projects_tech_stack on public.projects using gin (tech_stack);

-- Title search (trigram)
create index idx_projects_title_trgm on public.projects using gin (title gin_trgm_ops);

comment on table public.projects is 'Projects seeking collaborators. Lifecycle-managed with anti-ghost mechanisms.';
comment on column public.projects.first_milestone is 'Required concrete first milestone. Anti-vaporware quality gate.';
comment on column public.projects.last_active_at is 'Updated on any meaningful activity (application response, member join, status change). Used by auto-archive.';


-- ============================================================================
-- 4. PROJECT ROLES (open positions within a project)
-- ============================================================================
-- These are the *slots* a project is recruiting for.
-- Example: "Frontend Developer", "Designer", "Backend Engineer"
-- filled_by links to the user who filled this role (nullable = still open).
-- The filled_count on the project is derived, not stored, to avoid sync bugs.

create table public.project_roles (
    id              uuid primary key default gen_random_uuid(),
    project_id      uuid not null references public.projects(id) on delete cascade,

    title           text not null check (char_length(title) between 2 and 100),
    description     text check (char_length(description) <= 1000),
    required_skills text[] not null default '{}' check (array_length(required_skills, 1) is null or array_length(required_skills, 1) <= 10),

    -- Slot management: is this role filled?
    is_filled       boolean not null default false,
    filled_by       uuid references public.users(id) on delete set null,
    filled_at       timestamptz,

    created_at      timestamptz not null default now()
);

-- Fast lookup: open roles for a project
create index idx_project_roles_project on public.project_roles (project_id) where is_filled = false;

-- Prevent same user filling multiple roles on same project
create unique index idx_project_roles_filled_unique on public.project_roles (project_id, filled_by) where filled_by is not null;

comment on table public.project_roles is 'Open positions within a project. Each role is a slot that can be filled by one user.';
comment on column public.project_roles.is_filled is 'Denormalized for query performance. Kept in sync by fill_project_role().';


-- ============================================================================
-- 5. APPLICATIONS
-- ============================================================================
-- A user applies to fill a specific role on a project.
-- Anti-spam: unique constraint prevents duplicate applications to the same role.
-- Race condition prevention: role filling uses SELECT ... FOR UPDATE (see function).

create table public.applications (
    id              uuid primary key default gen_random_uuid(),
    project_id      uuid not null references public.projects(id) on delete cascade,
    role_id         uuid not null references public.project_roles(id) on delete cascade,
    applicant_id    uuid not null references public.users(id) on delete cascade,

    status          application_status not null default 'pending',

    pitch           text not null check (char_length(pitch) between 20 and 2000),

    reviewed_at     timestamptz,
    reviewer_note   text check (char_length(reviewer_note) <= 1000),

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    -- One application per user per role
    constraint uq_application_user_role unique (role_id, applicant_id)
);

-- Owner's review queue: pending applications for their projects
create index idx_applications_project_status on public.applications (project_id, status)
    where status = 'pending';

-- User's application history
create index idx_applications_applicant on public.applications (applicant_id, created_at desc);

comment on table public.applications is 'Applications to fill a specific project role. One per user per role.';
comment on column public.applications.pitch is 'Required application text. Quality gate — must be 20+ chars.';


-- ============================================================================
-- 6. MEMBERS (materialized team membership)
-- ============================================================================
-- When an application is accepted and the role is filled, a membership record
-- is created. This is the canonical "who is on which team" table.
-- Separate from applications for clean queries and independent lifecycle.

create table public.members (
    id              uuid primary key default gen_random_uuid(),
    project_id      uuid not null references public.projects(id) on delete cascade,
    user_id         uuid not null references public.users(id) on delete cascade,
    role_id         uuid not null references public.project_roles(id) on delete cascade,

    status          membership_status not null default 'active',

    joined_at       timestamptz not null default now(),
    left_at         timestamptz,

    -- One active membership per user per project
    constraint uq_member_user_project unique (project_id, user_id)
);

-- Team roster for a project
create index idx_members_project on public.members (project_id) where status = 'active';

-- User's active memberships (for enforcing max concurrent projects)
create index idx_members_user_active on public.members (user_id) where status = 'active';

comment on table public.members is 'Materialized team membership. Created when application is accepted and role is filled.';


-- ============================================================================
-- 7. FUNCTIONS — BUSINESS LOGIC IN THE DATABASE
-- ============================================================================
-- Critical operations that must be atomic and race-condition-free live here.
-- Application-layer code calls these functions rather than doing raw INSERTs.

-- ---------------------------------------------------------------------------
-- 7a. Fill a project role (accept application → create membership)
-- ---------------------------------------------------------------------------
-- Uses explicit row locking to prevent two applications from filling the
-- same role simultaneously.

create or replace function public.fill_project_role(
    p_application_id uuid,
    p_actor_id       uuid      -- the project owner performing this action
)
returns uuid                    -- returns the new member ID
language plpgsql
security definer                -- runs with table owner privileges (bypasses RLS for atomic op)
set search_path = public
as $$
declare
    v_app           record;
    v_role          record;
    v_project       record;
    v_active_count  int;
    v_member_id     uuid;
begin
    -- 1. Load application with lock
    select * into v_app
    from public.applications
    where id = p_application_id
    for update;

    if not found then
        raise exception 'Application not found: %', p_application_id;
    end if;

    if v_app.status != 'pending' then
        raise exception 'Application is not pending (current: %)', v_app.status;
    end if;

    -- 2. Verify actor is the project owner
    select * into v_project
    from public.projects
    where id = v_app.project_id;

    if v_project.owner_id != p_actor_id then
        raise exception 'Only the project owner can accept applications';
    end if;

    -- 3. Lock and check the role
    select * into v_role
    from public.project_roles
    where id = v_app.role_id
    for update;

    if v_role.is_filled then
        raise exception 'Role is already filled';
    end if;

    -- 4. Check applicant's active membership count (max 3 concurrent projects)
    select count(*) into v_active_count
    from public.members
    where user_id = v_app.applicant_id
      and status = 'active';

    if v_active_count >= 3 then
        raise exception 'Applicant has reached the maximum of 3 active project memberships';
    end if;

    -- 5. All checks pass — execute atomically

    -- Mark role as filled
    update public.project_roles
    set is_filled = true,
        filled_by = v_app.applicant_id,
        filled_at = now()
    where id = v_role.id;

    -- Accept this application
    update public.applications
    set status      = 'accepted',
        reviewed_at = now()
    where id = p_application_id;

    -- Reject all other pending applications for this role
    update public.applications
    set status      = 'rejected',
        reviewed_at = now(),
        reviewer_note = 'Role was filled by another applicant'
    where role_id = v_role.id
      and id != p_application_id
      and status = 'pending';

    -- Create membership
    insert into public.members (project_id, user_id, role_id)
    values (v_app.project_id, v_app.applicant_id, v_role.id)
    returning id into v_member_id;

    -- Touch project activity timestamp
    update public.projects
    set last_active_at = now(),
        updated_at     = now()
    where id = v_app.project_id;

    return v_member_id;
end;
$$;

comment on function public.fill_project_role is 'Atomically accept an application: fills the role, creates membership, rejects competing applications. Uses row-level locks to prevent race conditions.';


-- ---------------------------------------------------------------------------
-- 7b. Apply to a project role
-- ---------------------------------------------------------------------------
-- Validates: project is recruiting, role is open, user isn't the owner,
-- user isn't already a member, user hasn't hit active membership cap.

create or replace function public.apply_to_role(
    p_role_id      uuid,
    p_applicant_id uuid,
    p_pitch        text
)
returns uuid                    -- returns the new application ID
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role          record;
    v_project       record;
    v_active_count  int;
    v_app_id        uuid;
begin
    -- 1. Load role
    select * into v_role
    from public.project_roles
    where id = p_role_id;

    if not found then
        raise exception 'Role not found';
    end if;

    if v_role.is_filled then
        raise exception 'Role is already filled';
    end if;

    -- 2. Load project and verify it's recruiting
    select * into v_project
    from public.projects
    where id = v_role.project_id;

    if v_project.status != 'recruiting' then
        raise exception 'Project is not currently recruiting (status: %)', v_project.status;
    end if;

    -- 3. Cannot apply to own project
    if v_project.owner_id = p_applicant_id then
        raise exception 'Cannot apply to your own project';
    end if;

    -- 4. Cannot apply if already a member of this project
    if exists (
        select 1 from public.members
        where project_id = v_project.id
          and user_id = p_applicant_id
          and status = 'active'
    ) then
        raise exception 'Already a member of this project';
    end if;

    -- 5. Check active membership cap
    select count(*) into v_active_count
    from public.members
    where user_id = p_applicant_id
      and status = 'active';

    if v_active_count >= 3 then
        raise exception 'You have reached the maximum of 3 active project memberships';
    end if;

    -- 6. Create application
    insert into public.applications (project_id, role_id, applicant_id, pitch)
    values (v_project.id, p_role_id, p_applicant_id, p_pitch)
    returning id into v_app_id;

    -- Touch project activity
    update public.projects
    set last_active_at = now()
    where id = v_project.id;

    return v_app_id;
end;
$$;

comment on function public.apply_to_role is 'Submit an application to a project role with all business rule validation.';


-- ---------------------------------------------------------------------------
-- 7c. Create project (with anti-spam rate limiting)
-- ---------------------------------------------------------------------------
-- Enforces:
--   • Max 5 active/recruiting projects per user at any time
--   • Min 10-minute gap between project creations (anti-spam)
--   • User must be active

create or replace function public.create_project(
    p_owner_id          uuid,
    p_title             text,
    p_description       text,
    p_tech_stack        text[],
    p_max_members       int,
    p_first_milestone   text,
    p_time_commitment   availability,
    p_slack_channel_url text default null,
    p_repo_url          text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user              record;
    v_active_projects   int;
    v_project_id        uuid;
begin
    -- 1. Load user
    select * into v_user
    from public.users
    where id = p_owner_id
    for update;

    if not found then
        raise exception 'User not found';
    end if;

    if not v_user.is_active then
        raise exception 'Account is inactive';
    end if;

    -- 2. Anti-spam: 10-minute cooldown between project creations
    if v_user.last_project_created_at is not null
       and v_user.last_project_created_at > now() - interval '10 minutes' then
        raise exception 'Please wait before creating another project (rate limit)';
    end if;

    -- 3. Max 5 active/recruiting projects per user
    select count(*) into v_active_projects
    from public.projects
    where owner_id = p_owner_id
      and status in ('draft', 'recruiting', 'active');

    if v_active_projects >= 5 then
        raise exception 'Maximum of 5 active projects reached. Complete or archive existing projects first.';
    end if;

    -- 4. Create the project
    insert into public.projects (
        owner_id, title, description, tech_stack, max_members,
        first_milestone, time_commitment, slack_channel_url, repo_url,
        status
    )
    values (
        p_owner_id, p_title, p_description, p_tech_stack, p_max_members,
        p_first_milestone, p_time_commitment, p_slack_channel_url, p_repo_url,
        'draft'
    )
    returning id into v_project_id;

    -- 5. Update rate-limit timestamp
    update public.users
    set last_project_created_at = now()
    where id = p_owner_id;

    return v_project_id;
end;
$$;

comment on function public.create_project is 'Create a project with rate-limiting (10-min cooldown) and active project cap (max 5).';


-- ============================================================================
-- 8. AUTO-ARCHIVE INACTIVE PROJECTS
-- ============================================================================
-- Called by pg_cron or Supabase Edge Function on a daily schedule.
-- Two-phase: warn at 14 days, archive at 21 days.

create or replace function public.auto_archive_stale_projects()
returns table (
    project_id uuid,
    action     text
)
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Phase 1: Mark projects stale (no activity for 14+ days, not yet warned)
    -- The application layer reads stale_notified_at to send notifications.
    return query
    update public.projects
    set stale_notified_at = now(),
        updated_at        = now()
    where status in ('recruiting', 'active')
      and last_active_at < now() - interval '14 days'
      and stale_notified_at is null
    returning id as project_id, 'stale_warning' as action;

    -- Phase 2: Archive projects stale for 21+ days (7 days after warning)
    return query
    update public.projects
    set status     = 'archived',
        updated_at = now()
    where status in ('recruiting', 'active')
      and last_active_at < now() - interval '21 days'
      and stale_notified_at is not null
      and stale_notified_at < now() - interval '7 days'
    returning id as project_id, 'archived' as action;
end;
$$;

comment on function public.auto_archive_stale_projects is 'Two-phase stale project cleanup. Warn at 14 days inactive, archive at 21 days. Run via pg_cron daily.';


-- ============================================================================
-- 9. UPDATED_AT TRIGGER
-- ============================================================================
-- Generic trigger to keep updated_at columns current.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_users_updated_at
    before update on public.users
    for each row execute function public.set_updated_at();

create trigger trg_projects_updated_at
    before update on public.projects
    for each row execute function public.set_updated_at();

create trigger trg_applications_updated_at
    before update on public.applications
    for each row execute function public.set_updated_at();


-- ============================================================================
-- 10. ROW-LEVEL SECURITY POLICIES
-- ============================================================================
-- Defense-in-depth. These are the safety net behind application-layer auth.
-- Supabase sets auth.uid() from the JWT for every request.
--
-- Policy naming convention: {table}_{action}_{who}
-- ============================================================================

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_roles enable row level security;
alter table public.applications enable row level security;
alter table public.members enable row level security;

-- ---------------------------------------------------------------------------
-- 10a. USERS
-- ---------------------------------------------------------------------------

-- Anyone authenticated can read active user profiles (public directory)
create policy users_select_authenticated on public.users
    for select
    to authenticated
    using (is_active = true);

-- Users can update only their own profile
create policy users_update_own on public.users
    for update
    to authenticated
    using (id = auth.uid())
    with check (
        id = auth.uid()
        -- Cannot self-promote platform role
        and platform_role = (select platform_role from public.users where id = auth.uid())
    );

-- Admins can update any user (for moderation: ban, role changes)
create policy users_update_admin on public.users
    for update
    to authenticated
    using (
        exists (
            select 1 from public.users
            where id = auth.uid() and platform_role = 'admin'
        )
    );

-- ---------------------------------------------------------------------------
-- 10b. PROJECTS
-- ---------------------------------------------------------------------------

-- Public read: anyone authenticated can browse recruiting/active/completed projects
create policy projects_select_public on public.projects
    for select
    to authenticated
    using (status in ('recruiting', 'active', 'completed'));

-- Owners can see their own projects in any status (including draft/archived)
create policy projects_select_own on public.projects
    for select
    to authenticated
    using (owner_id = auth.uid());

-- Insert: only active users (actual creation goes through create_project())
create policy projects_insert_own on public.projects
    for insert
    to authenticated
    with check (
        owner_id = auth.uid()
        and exists (
            select 1 from public.users
            where id = auth.uid() and is_active = true
        )
    );

-- Update: owner can update their own project
create policy projects_update_own on public.projects
    for update
    to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

-- Admins can update any project (moderation)
create policy projects_update_admin on public.projects
    for update
    to authenticated
    using (
        exists (
            select 1 from public.users
            where id = auth.uid() and platform_role = 'admin'
        )
    );

-- No delete policy — projects are archived, never hard-deleted by users
-- (cascade delete only occurs if the owning auth.users row is removed)

-- ---------------------------------------------------------------------------
-- 10c. PROJECT ROLES
-- ---------------------------------------------------------------------------

-- Anyone authenticated can see roles for visible projects
create policy project_roles_select on public.project_roles
    for select
    to authenticated
    using (
        exists (
            select 1 from public.projects
            where id = project_id
              and (status in ('recruiting', 'active', 'completed') or owner_id = auth.uid())
        )
    );

-- Project owner can insert/update roles
create policy project_roles_insert_owner on public.project_roles
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.projects
            where id = project_id and owner_id = auth.uid()
        )
    );

create policy project_roles_update_owner on public.project_roles
    for update
    to authenticated
    using (
        exists (
            select 1 from public.projects
            where id = project_id and owner_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 10d. APPLICATIONS
-- ---------------------------------------------------------------------------

-- Applicants can see their own applications
create policy applications_select_own on public.applications
    for select
    to authenticated
    using (applicant_id = auth.uid());

-- Project owners can see applications for their projects
create policy applications_select_project_owner on public.applications
    for select
    to authenticated
    using (
        exists (
            select 1 from public.projects
            where id = project_id and owner_id = auth.uid()
        )
    );

-- Insert: only the applicant themselves (actual creation via apply_to_role())
create policy applications_insert_own on public.applications
    for insert
    to authenticated
    with check (applicant_id = auth.uid());

-- Applicant can withdraw their own application
create policy applications_update_own on public.applications
    for update
    to authenticated
    using (applicant_id = auth.uid())
    with check (
        applicant_id = auth.uid()
        -- Can only change status to 'withdrawn'
        and status = 'withdrawn'
    );

-- Project owner can accept/reject (via fill_project_role function, but direct
-- update policy for reject is also needed)
create policy applications_update_project_owner on public.applications
    for update
    to authenticated
    using (
        exists (
            select 1 from public.projects
            where id = project_id and owner_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 10e. MEMBERS
-- ---------------------------------------------------------------------------

-- Anyone authenticated can see who is on a team (public team rosters)
create policy members_select_public on public.members
    for select
    to authenticated
    using (status = 'active');

-- Project owner can see all members (including inactive/removed)
create policy members_select_project_owner on public.members
    for select
    to authenticated
    using (
        exists (
            select 1 from public.projects
            where id = project_id and owner_id = auth.uid()
        )
    );

-- Users can see their own memberships in any status
create policy members_select_own on public.members
    for select
    to authenticated
    using (user_id = auth.uid());

-- Insert: via fill_project_role() function only (security definer bypasses RLS).
-- No direct insert policy for regular users.

-- Project owner can update membership status (e.g., remove a member)
create policy members_update_project_owner on public.members
    for update
    to authenticated
    using (
        exists (
            select 1 from public.projects
            where id = project_id and owner_id = auth.uid()
        )
    );

-- Members can update their own status (e.g., leave a project)
create policy members_update_own on public.members
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (
        user_id = auth.uid()
        -- Can only set themselves to 'inactive' (leave)
        and status = 'inactive'
    );


-- ============================================================================
-- 11. ANONYMOUS READ ACCESS
-- ============================================================================
-- From our architecture: "Unauthenticated read access to public project listings."
-- Supabase's 'anon' role gets read-only access to recruiting/active projects.

create policy projects_select_anon on public.projects
    for select
    to anon
    using (status in ('recruiting', 'active', 'completed'));

create policy project_roles_select_anon on public.project_roles
    for select
    to anon
    using (
        exists (
            select 1 from public.projects
            where id = project_id
              and status in ('recruiting', 'active', 'completed')
        )
    );


-- ============================================================================
-- 12. VIEWS — COMMON QUERY PATTERNS
-- ============================================================================

-- Materialized view: project summary with member/role counts
-- Refresh periodically or on project changes via trigger.
create materialized view public.project_summary as
select
    p.id,
    p.title,
    p.owner_id,
    u.display_name as owner_display_name,
    p.status,
    p.tech_stack,
    p.time_commitment,
    p.last_active_at,
    p.created_at,
    (select count(*) from public.project_roles r where r.project_id = p.id) as total_roles,
    (select count(*) from public.project_roles r where r.project_id = p.id and r.is_filled = false) as open_roles,
    (select count(*) from public.members m where m.project_id = p.id and m.status = 'active') as active_members,
    (select count(*) from public.applications a where a.project_id = p.id and a.status = 'pending') as pending_applications
from public.projects p
join public.users u on u.id = p.owner_id
where p.status in ('recruiting', 'active');

create unique index idx_project_summary_id on public.project_summary (id);

comment on materialized view public.project_summary is 'Denormalized project listing for the discovery feed. Refresh via pg_cron or on significant events.';

-- Refresh function (called by cron or after significant events)
create or replace function public.refresh_project_summary()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    refresh materialized view concurrently public.project_summary;
end;
$$;


-- ============================================================================
-- 13. CRON SCHEDULE (pg_cron — enable via Supabase dashboard)
-- ============================================================================
-- These are the SQL statements to schedule; they require pg_cron extension
-- to be enabled in Supabase dashboard settings.
--
-- Run auto-archive daily at 03:00 UTC:
--   select cron.schedule(
--       'auto-archive-stale-projects',
--       '0 3 * * *',
--       $$select * from public.auto_archive_stale_projects()$$
--   );
--
-- Refresh project summary every 5 minutes:
--   select cron.schedule(
--       'refresh-project-summary',
--       '*/5 * * * *',
--       $$select public.refresh_project_summary()$$
--   );
