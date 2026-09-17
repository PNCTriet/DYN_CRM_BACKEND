# Frontend handoff — phân quyền (RBAC) + prompt audit

> Dán **§ Prompt (copy)** vào Cursor/agent FE.  
> Mục tiêu: đọc hết doc BE liên quan → rà setting phân quyền hiện tại trên UI → chỉnh cho khớp contract (không invent RBAC thứ hai).

---

## Docs bắt buộc đọc (theo thứ tự)

| # | File | Đọc vì |
|---|------|--------|
| 1 | [`../Authorization.md`](../Authorization.md) | Capability vs Scope vs Business rule; catalog `resource.action`; role→group |
| 2 | [`auth.md`](./auth.md) | Shape `/auth/me`; Google → `PENDING_APPROVAL`; refresh permission |
| 3 | [`FRONTEND_HANDOFF_AUTH.md`](./FRONTEND_HANDOFF_AUTH.md) | Flow login → token → `/auth/me` |
| 4 | [`identity-admin.md`](./identity-admin.md) | Admin `PUT /users/:id/roles`, `PUT /roles/:id/permission-groups` |
| 5 | [`../BACKEND_GAPS.md`](../BACKEND_GAPS.md) | Mục 5: matrix trang **≠** RBAC API (chọn A) |
| 6 | [`expenses.md`](./expenses.md) + [`orders.md`](./orders.md) | Duyệt chi = `expense.approve` (không còn gate `reviewerUserId`) |
| 7 | [`README.md`](./README.md) | Index contract + error 401/403 |

Base API: `https://apidyn.otcayxe.com/api/v1` (prod) · Swagger: https://apidyn.otcayxe.com/docs

---

## Contract ngắn (để đối chiếu nhanh)

### Nguồn sự thật API = `GET /auth/me`

```ts
interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  status: string; // ACTIVE | PENDING_APPROVAL | INVITED | SUSPENDED | DEACTIVATED
  roleCodes: string[];
  permissions: string[]; // "customer.view", "expense.approve", …
}
```

- Ẩn/disable nút **theo `permissions`**, vẫn phải handle **403** từ API.  
- Sau admin gán role → **gọi lại `/auth/me`** (hoặc login lại). Token cũ không tự refresh permission.

### Ba lớp (đừng gộp một điều kiện UI)

| Lớp | Câu hỏi | FE làm gì |
|-----|---------|-----------|
| Capability | Có `permissions` chứa `resource.action`? | Ẩn/disable; thiếu → API 403 |
| Data scope | OWN / TEAM / ALL (policy BE) | List có thể ngắn hơn; 403 = ngoài scope |
| Business rule | VD stage / status trên entity | Đọc field dữ liệu khi doc yêu cầu; duyệt chi **không** còn bắt `reviewerUserId` |

### Hai hệ — không đồng bộ tự động (phương án A)

| | `crm.pagePermissions` (config) | `AuthUser.permissions` |
|--|-------------------------------|-------------------------|
| Mục đích | Menu / View-Edit trang trên UI | Chặn API thật (`RbacGuard`) |
| Đổi bằng | `PATCH /config/crm.pagePermissions` | Admin gán role / permission-group |
| Lưu xong | **Không** đổi 403 API | User refresh `/auth/me` |

**Cấm:** giả định lưu matrix trang xong là user gọi được `POST /expenses/:id/approve`.

### Chờ duyệt (Google)

- `status ∈ PENDING_APPROVAL | INVITED` **hoặc** `roleCodes` + `permissions` đều rỗng → `/pending-approval`, không hydrate API nghiệp vụ.  
- `/auth/me` vẫn **200** (có token).  
- `GET /config` **không** gắn permission — vẫn đọc được; **đừng** dùng làm tín hiệu đã duyệt.

### Ví dụ duyệt chi

Chỉ cần: `'expense.approve' ∈ permissions` → duyệt/reject được expense của **mọi** đơn (expense phải `PENDING`).

Role seed có `expense.approve`: SUPER_ADMIN, ADMIN, ACCOUNTING (qua group `finance.full`). MANAGER **không** có mặc định.

`order.reviewerUserId` vẫn tồn tại trên Order (metadata) nhưng **không** gate API duyệt chi.

---

## § Prompt (copy)

```text
Bạn là Frontend lead (Next.js) của DYN CRM. Nhiệm vụ: ĐỌC HẾT các document phân quyền phía backend trong repo BE (hoặc bản copy trong apps/web/document nếu team sync), rồi AUDIT + CHỈNH code FE cho khớp — không invent hệ RBAC thứ hai trên client.

## Docs bắt buộc (đọc trước khi sửa code)

Theo thứ tự:
1. docs/04-development/Authorization.md
2. docs/04-development/api/auth.md  (đặc biệt /auth/me + Google PENDING_APPROVAL)
3. docs/04-development/api/FRONTEND_HANDOFF_AUTH.md
4. docs/04-development/api/identity-admin.md
5. docs/04-development/BACKEND_GAPS.md  (mục 5 — page matrix vs API RBAC)
6. docs/04-development/api/expenses.md + orders.md  (expense.approve)
7. docs/04-development/api/FRONTEND_HANDOFF_RBAC.md  (file này — contract ngắn)

API prod: https://apidyn.otcayxe.com/api/v1
Swagger: https://apidyn.otcayxe.com/docs

## Quy tắc cứng

1. Nguồn sự thật capability = GET /auth/me → permissions[] + roleCodes[] + status.
2. Matrix crm.pagePermissions (GET/PATCH /config) CHỈ điều khiển menu/UX trang — KHÔNG thay thế permissions[] khi quyết định gọi API.
3. Không hard-code if (role === 'ADMIN') cho capability; dùng permissions.includes('resource.action').
4. User PENDING_APPROVAL / INVITED / permissions+roleCodes rỗng → màn chờ duyệt, không hydrate CRM API.
5. Sau admin PUT roles / permission-groups → bắt buộc refresh /auth/me (hoặc re-login).
6. Mọi nút nguy hiểm (approve expense, void payment, …) check permission theo api/*.md; vẫn handle 403/400 từ API.
7. Không gửi field lạ trong PATCH (forbidNonWhitelisted → 400).

## Việc cần làm

### A. Audit hiện trạng (viết báo cáo ngắn trước khi sửa)

Rà codebase FE:
- Auth store / session: sau login/OAuth có gọi /auth/me không? Lưu permissions ở đâu?
- Route guard / middleware: dựa status? roleCodes? permissions? matrix trang?
- Menu / SYSTEM_PAGES: đọc crm.pagePermissions thế nào? Có nhầm dùng matrix để cho phép gọi API không?
- Nút Duyệt chi / reject: có check `hasPermission('expense.approve')` không? (không còn bắt reviewerUserId)
- Có chỗ if (role === …) thay vì permission không?
- Sau gán role trên trang Users: có refresh /auth/me cho user đang login không? (ít nhất document UX: user kia phải re-login / refresh)

Liệt kê: ĐÃ KHỚP / LỆCH DOC / THIẾU — kèm file path.

### B. Plan chỉnh (phê duyệt rồi mới code nếu team yêu cầu)

1. Single source: hook/useAuthMe hoặc tương đương — permissions, roleCodes, status, hasPermission(code), isPendingApproval.
2. Pending gate: khớp auth.md (PENDING_APPROVAL | INVITED | empty roles+perms).
3. Page access: matrix View/Edit cho menu; API calls vẫn gated bởi hasPermission theo Authorization.md + từng api/*.md.
4. Expense approvals UI: disable/ẩn nếu !hasPermission('expense.approve').
5. Orders: `reviewerUserId` optional metadata qua PATCH nếu cần UX; không dùng để ẩn nút duyệt chi.
6. Error handling: 401 → logout/login; 403 → toast thiếu quyền / ngoài scope; không silent fail.
7. Admin Users: sau PUT roles + PATCH ACTIVE, nhắc user chờ duyệt refresh session.

### C. Checklist nghiệm thu

- [ ] Login Google user mới → /pending-approval; /auth/me status PENDING_APPROVAL, permissions [].
- [ ] Admin gán role + ACTIVE → user refresh /auth/me → permissions có dữ liệu → vào app.
- [ ] User không có expense.approve → không gọi được approve (UI disable + API 403 nếu bypass).
- [ ] User có expense.approve → duyệt được mọi đơn (expense PENDING); không phụ thuộc reviewerUserId.
- [ ] Đổi crm.pagePermissions không tự mở API mà user thiếu permission.
- [ ] Không còn hard-code role name cho capability (trừ hiển thị label).

### D. Deliverable

1. Báo cáo audit (A)
2. Diff / PR chỉnh (B)
3. Checklist (C) đã tick kèm cách test (token / account)

Bắt đầu bằng đọc doc + audit — chưa sửa code cho đến khi báo cáo A xong (trừ khi user bảo implement luôn).
```

---

## Liên kết

- Auth smoke trước: [`FRONTEND_HANDOFF_AUTH.md`](./FRONTEND_HANDOFF_AUTH.md)  
- Integrate module API: [`FRONTEND_INTEGRATION_PROMPT.md`](./FRONTEND_INTEGRATION_PROMPT.md)  
- BE gaps trạng thái: [`../BACKEND_GAPS.md`](../BACKEND_GAPS.md)
