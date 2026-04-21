# Security Notes

## Local Backend Role Model

The local backend now supports role-based access tokens:

- `admin`: full content + analytics + delete access
- `teacher`: content create/update + analytics access

Token sources accepted by the backend:

1. `x-admin-key` header
2. `Authorization: Bearer <token>` header

### Endpoint Access Matrix

| Endpoint | Teacher | Admin |
|---|---:|---:|
| `GET /content/lessons?includeDraft=true` | Yes | Yes |
| `POST /content/lessons` | Yes | Yes |
| `PUT /content/lessons/:id` | Yes | Yes |
| `DELETE /content/lessons/:id` | No | Yes |
| `GET /analytics/summary` | Yes | Yes |

## Local Backend Setup (PowerShell)

```powershell
$env:ADMIN_API_KEY="your-admin-token"
$env:TEACHER_API_KEY="your-teacher-token"
npm run backend
```

Client-side admin screen token env options:

- `EXPO_PUBLIC_ADMIN_API_KEY`
- `EXPO_PUBLIC_TEACHER_API_KEY`

## Supabase Hardening

`supabase/schema.sql` now defines strict RLS policies using `public.app_user_roles` and `public.has_app_role()`.

### Bootstrap an Admin User

After creating/authenticating your user in Supabase Auth, run:

```sql
insert into public.app_user_roles (user_id, role)
values ('<auth-user-uuid>', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

### Assign Teacher Role

```sql
insert into public.app_user_roles (user_id, role)
values ('<auth-user-uuid>', 'teacher')
on conflict (user_id) do update set role = excluded.role;
```
