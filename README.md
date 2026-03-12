# HackCollab

A structured collaboration platform for Hack Club members — find collaborators, form teams, and build projects together.

Built with [Next.js 15](https://nextjs.org/), [Supabase](https://supabase.com/), and [Tailwind CSS v4](https://tailwindcss.com/).

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template and fill in your Supabase credentials
cp .env.local.example .env.local

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com/) and create a new project.
2. Run the initial migration against your database. In the Supabase SQL Editor, paste the contents of [`supabase/migrations/00001_initial_schema.sql`](supabase/migrations/00001_initial_schema.sql) and execute it.
3. Note your **Project URL** and **anon public** key from Settings → API.

### 2. Configure Supabase Auth (Hack Club OIDC)

1. In the Supabase dashboard, go to **Authentication → Providers**.
2. Enable the **Keycloak** provider (this maps to Hack Club's OIDC).
3. Set the **Keycloak URL** to the Hack Club OIDC issuer.
4. Set the **Redirect URL** in the Hack Club OIDC config to:
   ```
   https://<YOUR_SUPABASE_PROJECT>.supabase.co/auth/v1/callback
   ```

### 3. Deploy on Vercel

1. Import the repository on [vercel.com](https://vercel.com/).
2. Vercel auto-detects the Next.js framework — no `vercel.json` required.
3. Set these **Environment Variables** in the Vercel dashboard (Settings → Environment Variables):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
   | `NEXT_PUBLIC_SITE_URL` | Your production URL (e.g. `https://hackcollab.vercel.app`) |

4. Deploy. Vercel runs `npm run build` automatically.

### Preview Deployments

Vercel creates a unique URL for every push / pull request. The auth callback handler uses `x-forwarded-host` to redirect correctly on preview URLs — no extra config needed.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed overview of the system design, database schema, and technical decisions.