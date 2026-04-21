# Eco-Ed Mobile App (Expo)

Eco-Ed is an Expo/React Native learning app with:
- lesson + quiz flow
- gamified progress (XP, streaks, daily challenges)
- role-based navigation
- Supabase-backed cloud persistence

## 1. Run Locally

Install dependencies and start Expo:

```bash
npm install
npx expo start
```

## 2. Configure Cloud Storage (Supabase)

Create `.env` from `.env.example` and set:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Keep `EXPO_PUBLIC_API_BASE_URL` empty if you want direct Supabase mode.

Then run [`supabase/schema.sql`](./supabase/schema.sql) in Supabase SQL Editor.

Important:
- Enable **Anonymous Sign-Ins** in Supabase Auth (`Authentication -> Providers -> Anonymous`) for the current app bootstrap flow.
- The app resolves a Supabase user session, then syncs `user_progress` (`progress_map` + `gamification_state`) automatically.

## 3. Verify Cloud Sync

Open the app and go to `Settings`:
- check `Cloud Sync Enabled`
- check `Cloud Sync Status`
- confirm `Cloud User ID` is populated

You can also use the `Courses` screen buttons:
- `Pull Cloud`
- `Push Cloud`

## 4. Deploy (EAS) With Cloud Env Vars

Set public env vars for each EAS environment you use:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project-ref>.supabase.co" --environment preview
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>" --environment preview

eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project-ref>.supabase.co" --environment production
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>" --environment production
```

Then build/update normally (`npm run draft`, `npm run deploy`, or `eas build ...`).

## 5. Fallback Behavior

If no Supabase and no REST backend config is present:
- lessons load from local curriculum fallback
- progress persists only in device `AsyncStorage`
- no cross-device sync

### Demo Admin Mode (Anonymous Testing)

If you want to test Teacher/Admin lesson editing without a backend or account:
- Set `EXPO_PUBLIC_ALLOW_LOCAL_ADMIN=true`
- The admin screen will use local AsyncStorage for create/edit/publish/delete
- Student views will read from the same local curriculum store

### Fully Local Frontend Mode

If Supabase auth is blocking your presentation, you can disable backend calls entirely:
- Set `EXPO_PUBLIC_DISABLE_BACKEND=true`
- The app runs fully on local data (curriculum + progress)

## Supabase local test script

To verify your public (anon) keys can read published lessons, create a local `.env` from `.env.example` and run the included test script:

```bash
# install deps if needed
npm install

# run the test (environment variables loaded from your shell or .env via dotenv)
EXPO_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co" \
EXPO_PUBLIC_SUPABASE_ANON_KEY="<anon-key>" \
node scripts/test-supabase-connection.js
```

If the query returns published lessons, your anon key and RLS read policy are configured correctly.
