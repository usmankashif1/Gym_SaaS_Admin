<!-- # GymFlow

GymFlow is a web-only gym management app built with Expo, React Native Web, Expo Router, and Supabase.

## Local Development

Docker Desktop must be running. Start the local Supabase stack and inspect its endpoints:

```bash
npx supabase start
npx supabase status
```

Open Studio at `http://127.0.0.1:54323` and use **Table Editor** to inspect the GymFlow tables. The local API is `http://127.0.0.1:54321`.

Apply pending migrations without resetting the local database:

```bash
npx supabase migration up --local
```

To connect the web app, set the **Project URL** and **Publishable** key shown by `npx supabase status` in `.env.local`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The publishable key is safe for browser use with the database's RLS policies. Never put the **Secret** key in a `EXPO_PUBLIC_*` variable or browser bundle. Restart the web server after changing environment variables:

```bash
npm run web
```

The app requires Supabase configuration and never falls back to sample records. During registration, the owner can enter the gym name and optionally upload a PNG, JPEG, or WebP logo up to 2 MB. The database trigger creates the gym workspace; the logo is stored in the `gym-logos` bucket with owner-only upload policies.

After signing in, owners can change the gym name or replace its logo using **Settings** beside the account at the bottom of the left sidebar.

Create membership plans from **Subscription**. Adding a member records the selected plan's first monthly fee as a paid payment in the same database transaction as the member; collected totals then include that payment. Member records can be edited from the Members roster. Membership plan changes update the member's current displayed plan price, while existing payment rows retain the amount actually recorded at payment time.

`npx supabase db reset` also applies migrations, but drops and recreates the local database. Use it only when you intend to reset local data.

## Hosted Supabase

Create a Supabase project, then link the CLI and apply migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the web deployment environment using the hosted project's API settings, then redeploy.

## Checks

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
``` -->