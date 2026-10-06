# Auth API — FE contract (Next.js)

> **Status: LIVE** · Module: `identity` · Swagger tag: `auth`  
> Base: `/api/v1/auth`  
> IdP: **Supabase Auth** via NestJS BFF (`AuthPort`) — FE **không** gọi Supabase Auth trực tiếp cho business session (Architecture AD-A3).

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | Public | Đăng ký + tạo `users` local + gán role mặc định |
| POST | `/auth/login` | Public | Đăng nhập email/password |
| GET | `/auth/oauth/google` | Public | **302** bắt đầu Google OAuth (browser) |
| GET | `/auth/oauth/callback` | Public | Callback Supabase → Nest → **302** FE (hash tokens) |
| POST | `/auth/refresh` | Public | Đổi access token bằng refresh token |
| POST | `/auth/forgot-password` | Public | Gửi email reset (Supabase) |
| POST | `/auth/logout` | Bearer | Sign-out global phía IdP |
| POST | `/auth/change-password` | Bearer | Đổi mật khẩu session hiện tại |
| GET | `/auth/me` | Bearer | User + roles + permissions |

---

## Session response (signup / login / refresh)

```ts
interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  status: string; // ACTIVE | …
  permissions: string[];
  roleCodes: string[];
}

interface SessionResponse {
  accessToken: string;   // dùng làm Bearer cho mọi API
  refreshToken: string;
  expiresIn: number;     // seconds
  expiresAt?: number;    // unix seconds (nếu IdP trả)
  tokenType: string;     // "bearer"
  user: AuthUser;
}
```

FE lưu `accessToken` + `refreshToken` (memory / httpOnly cookie — khuyến nghị cookie qua BFF sau này). Mỗi request business:

```http
Authorization: Bearer <accessToken>
```

---

## POST `/auth/signup`

**Body**

| Field | Type | Rules |
|-------|------|--------|
| email | string | email |
| password | string | min 8 |
| displayName | string | 1–200 |

**Response**

- Có session ngay → `SessionResponse` (như login)
- Supabase bật **Confirm email** →:

```json
{
  "requiresEmailConfirmation": true,
  "message": "Account created. Confirm email… then POST /auth/login",
  "user": { "id": "…", "email": "…", "permissions": [], "roleCodes": ["SALES"], … }
}
```

FE: nếu `requiresEmailConfirmation === true` → hiện “check email”, chưa lưu token.

| Dev tip (Swagger test nhanh):  
Supabase Dashboard → **Authentication** → **Providers** → **Email** → tắt **Confirm email** → signup email mới → nhận `accessToken` ngay.

**Production base:** `https://apidyn.otcayxe.com/api/v1` · Swagger: https://apidyn.otcayxe.com/docs

**Errors:** `400` validation / Supabase; `409` email already registered

---

## POST `/auth/login`

**Body:** `{ email, password }`  
**Response:** `SessionResponse`  
**401** sai credentials / user SUSPENDED|DEACTIVATED trên Nest

Nếu IdP OK nhưng chưa có `users` local → auto-provision (same as signup role).

---

## Google / Gmail OAuth (Nest BFF)

FE **không** gọi Supabase Auth / Google SDK. Browser chỉ redirect qua Nest.

```text
FE  →  GET /auth/oauth/google?redirectTo=<FE_callback>
    →  302 Google (via Supabase)
    →  Google consent
    →  GET /auth/oauth/callback?code=…   (Nest; PKCE cookie)
    →  302 <FE_callback>#access_token=…&refresh_token=…&expires_in=…&token_type=bearer
```

### Setup (một lần — BE / Dashboard)

1. **Google Cloud Console** → OAuth 2.0 Client (Web) → Client ID + Secret.  
   Authorized redirect URI **chỉ có một** — của Supabase, không phải của Nest:
   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
2. **Supabase → Authentication → Providers → Google** → bật + dán Client ID/Secret.
3. **Supabase → Authentication → URL Configuration → Redirect URLs** — thêm callback của Nest cho **mọi môi trường** (thiếu bước này thì Supabase chặn redirect cuối):
   ```
   http://localhost:3000/api/v1/auth/oauth/callback
   https://apidyn.otcayxe.com/api/v1/auth/oauth/callback
   ```
4. **Env backend** (`.env` local + Railway Variables cho prod):

| Env | Local | Production |
|-----|-------|------------|
| `API_PUBLIC_URL` | `http://localhost:3000` | `https://apidyn.otcayxe.com` |
| `OAUTH_REDIRECT_ALLOW_PREFIX` | `http://localhost:3001` | `https://crm-dny-ui-sepia.vercel.app` |
| `OAUTH_SUCCESS_REDIRECT_URL` | `http://localhost:3001/auth/callback` | `https://crm-dny-ui-sepia.vercel.app/auth/callback` |

Allow-list nhận nhiều prefix ngăn cách bằng dấu phẩy, hữu ích khi vừa test local vừa test domain preview:
`OAUTH_REDIRECT_ALLOW_PREFIX="https://crm-dny-ui-sepia.vercel.app,http://localhost:3001"`

`API_PUBLIC_URL` quyết định callback URL Nest gửi cho Supabase — phải trùng chính xác một dòng trong Redirect URLs ở bước 3.

FE và BE khác domain vẫn chạy được: cookie PKCE (`SameSite=Lax`, `Secure` khi `NODE_ENV=production`) được gửi kèm vì callback là điều hướng GET top-level.

### GET `/auth/oauth/google`

| Query | Required | Notes |
|-------|----------|--------|
| `redirectTo` | no | FE URL sau login; mặc định `OAUTH_SUCCESS_REDIRECT_URL`. Phải **bắt đầu bằng** một prefix trong `OAUTH_REDIRECT_ALLOW_PREFIX` |

Response: **302** tới Google/Supabase. Set httpOnly cookie PKCE (`dyn_oauth_pkce`, path `/api/v1/auth`, TTL 10 phút).

### GET `/auth/oauth/callback`

Supabase gọi endpoint này (không phải FE). Nest exchange code → `ensureLocalUser` → **302** về `redirectTo` với **hash**:

| Hash param | Meaning |
|------------|---------|
| `access_token` | Bearer cho API |
| `refresh_token` | `/auth/refresh` |
| `expires_in` | seconds |
| `token_type` | `bearer` |
| `expires_at` | optional unix seconds |
| `error` / `error_description` | nếu OAuth thất bại |

**MVP note:** tokens trong URL hash — FE parse một lần rồi xóa hash; tránh log XSS. Phase sau có thể chuyển httpOnly cookie BFF.

Email trùng user password nhưng khác `authSubjectId` **chưa** merge (OPEN).

### User Google lần đầu — chờ admin duyệt

Ai có Gmail cũng bấm login được, nên user Google mới **không** được gán role:

| | Google lần đầu | `POST /auth/signup` (email/password) |
|---|---|---|
| `status` | `PENDING_APPROVAL` | `ACTIVE` |
| Role | không có | `DEFAULT_SIGNUP_ROLE` (mặc định `SALES`) |

Login vẫn thành công và trả token thật — `PENDING_APPROVAL` **không** bị `AuthGuard` chặn, để FE gọi được `/auth/me`. Nhưng vì không có role nên `permissions` rỗng, mọi endpoint có `@RequirePermission` trả **403**.

FE dựa vào `/auth/me`: `status` ∈ `PENDING_APPROVAL | INVITED`, hoặc `roleCodes` + `permissions` đều rỗng → đẩy sang `/pending-approval`, không hydrate API.

Admin duyệt bằng hai lệnh (đều cần `user.manage`):

```http
PUT   /users/:id/roles   { "roleCodes": ["SALES"] }
PATCH /users/:id         { "status": "ACTIVE" }
```

Đổi role, nhóm quyền, hoặc status **có hiệu lực ở request kế tiếp** trên instance vừa ghi (cache auth của user bị xóa ngay). Instance khác thấy thay đổi trong `AUTH_USER_CACHE_TTL_MS` (mặc định 45 giây). Không cần đăng nhập lại cho đường load quyền từ DB.

Nếu bật Custom Access Token Hook (optional, bên dưới), permission nằm trong access token và chỉ đổi khi token được cấp lại (refresh). Status `SUSPENDED` / `DEACTIVATED` vẫn bị chặn từ DB.

### Next.js sketch

```ts
const API = process.env.NEXT_PUBLIC_API_URL!; // http://localhost:3000/api/v1

export function loginWithGoogle() {
  const redirectTo = `${window.location.origin}/auth/callback`;
  window.location.href =
    `${API}/auth/oauth/google?redirectTo=${encodeURIComponent(redirectTo)}`;
}

// app/auth/callback/page.tsx (client)
useEffect(() => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const err = params.get('error');
  if (err) {
    // show error_description
    return;
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = Number(params.get('expires_in') ?? 0);
  if (!accessToken || !refreshToken) return;
  // save like after POST /auth/login
  window.history.replaceState(null, '', window.location.pathname);
  // optional: GET /auth/me with accessToken
}, []);
```

---

## POST `/auth/refresh`

**Body:** `{ refreshToken: string }`  
**Response:** `SessionResponse` (token mới + user)

---

## POST `/auth/forgot-password`

**Body:** `{ email, redirectTo? }`  
`redirectTo` phải nằm trong Supabase Auth redirect allow-list (URL trang reset Next.js).

**Response:** luôn `{ success: true }` (tránh email enumeration).

---

## POST `/auth/logout`

**Header:** `Authorization: Bearer <accessToken>`  
**Response:** `{ success: true }`  
FE phải xóa token local sau khi gọi.

---

## POST `/auth/change-password`

**Header:** Bearer  
**Body:** `{ newPassword: string }` (min 8)  
**Response:** `{ success: true }`

---

## GET `/auth/me`

**Header:** Bearer (Supabase JWT **hoặc** dev `test:<userId>` khi `AUTH_MODE=test`)  
**Response:** `AuthUser`

Dùng `permissions` để ẩn/hiện UI — vẫn phải dựa vào 403 từ API.

---

## Next.js sketch

```ts
const API = process.env.NEXT_PUBLIC_API_URL!;

export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<SessionResponse>;
}

export async function apiFetch(path: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 401) {
    // TODO: gọi /auth/refresh rồi retry
  }
  return res;
}
```

---

## Dev tokens (Swagger / QA không cần password)

Khi `AUTH_MODE=test` (default local):

| Role | Bearer |
|------|--------|
| Admin | `test:11111111-1111-4111-8111-111111111101` |
| Sales | `test:11111111-1111-4111-8111-111111111103` |

Seed users **chưa** có password Supabase — muốn login thật: dùng `/auth/signup` tạo user mới, hoặc tạo user trên Supabase Dashboard rồi `/auth/login` (Nest sẽ provision).

---

## Env (backend)

| Var | Purpose |
|-----|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Auth client key |
| `AUTH_MODE` | `test` = cho phép `test:` tokens + JWT; set `supabase` để chỉ JWT |
| `DEFAULT_SIGNUP_ROLE` | default `SALES` (cả signup + Google lần đầu) |
| `PASSWORD_RESET_REDIRECT_URL` | optional default redirect |
| `OAUTH_REDIRECT_ALLOW_PREFIX` | Prefix(es) cho phép của FE `redirectTo` (comma-separated) |
| `OAUTH_SUCCESS_REDIRECT_URL` | Default FE callback nếu không truyền `redirectTo` |
| `API_PUBLIC_URL` | Optional absolute API origin cho Nest OAuth callback URL |
| `SUPABASE_JWT_SECRET` | Legacy HS256 JWT secret (Dashboard → Project Settings → API). Asymmetric projects verify via JWKS and do not need this. If unset and the token is HS256, auth falls back to Supabase `getUser` (slower, still correct). |
| `AUTH_USER_CACHE_TTL_MS` | In-memory auth cache. Default `45000`. `0` disables it. |

---

## Auth on each request

`Authorization: Bearer <accessToken>` still resolves to the same `AuthUser` (`id`, `email`, `displayName`, `status`, `permissions`, `roleCodes`). Response bodies are unchanged.

What changed inside the guard:

1. The access token is verified **locally** (HS256 with `SUPABASE_JWT_SECRET`, or ES256/RS256/EdDSA with `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`). Expired, bad-signature, and non-JWT tokens are **401** without calling Supabase Auth. If local verify cannot run (legacy HS256 and no secret, or JWKS unreachable), the guard falls back to Supabase `auth.getUser`.
2. Permissions load in **one SQL query** (user + role codes + permission codes), then stay in an in-memory cache keyed by user id for `AUTH_USER_CACHE_TTL_MS`. Data scope (OWN / TEAM / ALL) is unchanged — it still reads `permissions` on the resolved user.
3. Cache is dropped in-process when an admin changes that user's status or roles, or when a role's permission groups / a group's permissions change. A suspended or deactivated user is not served from cache.
4. `AUTH_MODE=supabase` does **not** accept `test:` tokens.

`permission` and `roleCodes` arrays are sorted alphabetically. Membership is the contract.

### Optional: Custom Access Token Hook

Not required. Without it, every cache miss reads permissions from Postgres (one query) and the API behaves as before.

With it, a verified access token may carry `crm_permissions` and `crm_role_codes`. The API uses those claims only when `crm_permissions` is a **non-empty** string array, and it still loads the user row to enforce status. Empty or missing claims fall back to the database, so a hook that fails open cannot lock everyone out.

Manual steps (Supabase SQL editor, then Dashboard → Authentication → Hooks → Custom Access Token):

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  uid text;
  perms text[];
  roles text[];
begin
  claims := event->'claims';
  uid := event->>'user_id';

  select
    coalesce(array_agg(distinct r.code) filter (where r.code is not null), '{}'),
    coalesce(array_agg(distinct p.code) filter (where p.code is not null), '{}')
  into roles, perms
  from public.users u
  left join public.user_roles ur on ur.user_id = u.id
  left join public.roles r on r.id = ur.role_id
  left join public.role_permission_groups rpg on rpg.role_id = r.id
  left join public.group_permissions gp on gp.permission_group_id = rpg.permission_group_id
  left join public.permissions p on p.id = gp.permission_id
  where u.auth_subject_id = uid
    and u.deleted_at is null
    and u.status::text not in ('SUSPENDED', 'DEACTIVATED')
  group by u.id;

  claims := jsonb_set(claims, '{crm_role_codes}', to_jsonb(coalesce(roles, '{}'::text[])));
  claims := jsonb_set(claims, '{crm_permissions}', to_jsonb(coalesce(perms, '{}'::text[])));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on table public.users to supabase_auth_admin;
grant select on table public.user_roles to supabase_auth_admin;
grant select on table public.roles to supabase_auth_admin;
grant select on table public.role_permission_groups to supabase_auth_admin;
grant select on table public.group_permissions to supabase_auth_admin;
grant select on table public.permissions to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
```

Then enable the hook in the dashboard and point it at `public.custom_access_token_hook`. Keep access-token lifetime short (5–15 minutes) so a role change reaches the token quickly. Until that refresh, this API still blocks `SUSPENDED` / `DEACTIVATED` from the user row.

---

## Not in this slice

- Invite-only signup gate (OPEN — hiện open signup + default role)  
- Link Google ↔ email/password cùng email (conflict `authSubjectId`)  
- Apple / Facebook OAuth  
- HttpOnly session cookie BFF (thay hash fragment)  
