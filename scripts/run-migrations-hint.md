# Run database setup (required once)

Your Supabase project does not have tables yet. Do this **once**:

1. Open https://supabase.com/dashboard/project/nuxiinkfwffindrfejvt/sql/new
2. Copy all of `supabase/migrations/001_initial_schema.sql` → paste → **Run**
3. Copy all of `supabase/seed.sql` → paste → **Run**
4. Then either:
   - Run `node scripts/attach-user.mjs assassinnightcap008@gmail.com admin`
   - OR paste `supabase/attach-admin-user.sql` in SQL Editor → **Run**

Then sign in at http://localhost:3000/login with the email/password you set in Supabase Auth.
