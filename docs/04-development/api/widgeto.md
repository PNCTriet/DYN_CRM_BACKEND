# Widgeto API — public dashboard aggregates

> **Status: LIVE** · Module: `widgeto` · Swagger tag: `widgeto`  
> Base: `/api/v1/widgeto`  
> Auth: **shared secret** (không JWT / không Bearer user)

Embed / Widgeto đọc KPI giống dashboard CRM (customers · orders · payments) nhưng **một header cố định**, không cần đăng nhập user.

---

## Auth

```http
X-Widgeto-Key: <WIDGETO_API_KEY>
```

| Rule | Chi tiết |
|------|----------|
| Header | `X-Widgeto-Key` (bắt buộc) |
| Env BE | `WIDGETO_API_KEY` |
| Sai / thiếu | **401** — không lộ chi tiết |
| Không dùng | `Authorization: Bearer …` |

So khớp key dùng so sánh constant-time. Response chỉ **aggregate** (count / sum) — **không** trả PII (email, phone, tên khách).

```bash
curl -s "https://apidyn.otcayxe.com/api/v1/widgeto/summary" \
  -H "X-Widgeto-Key: $WIDGETO_API_KEY"
```

---

## Endpoints

| Method | Path | Mục đích |
|--------|------|----------|
| GET | `/widgeto/summary` | Gom KPI (1 call cho widget) |
| GET | `/widgeto/customers` | Khách theo `status` |
| GET | `/widgeto/orders` | Đơn theo `stage` |
| GET | `/widgeto/payments` | Thanh toán theo `verificationStatus` + tổng VERIFIED |

### Query chung (optional)

| Param | Type | Notes |
|-------|------|--------|
| `from` | ISO date/datetime | Inclusive lower bound |
| `to` | ISO date/datetime | Inclusive upper bound |

- Customers / orders: filter `createdAt`  
- Payments: filter `recordedAt`  
- Omit cả hai = all-time  
- Soft-deleted customers (`deletedAt != null`) **không** đếm

---

## Types

```ts
interface WidgetoCustomersStats {
  total: number;
  byStatus: Record<string, number>; // free-form keys, default "active"
}

interface WidgetoOrdersStats {
  total: number;
  byStage: Record<string, number>; // free-form stage strings
}

interface WidgetoPaymentsStats {
  totalCount: number;
  verifiedCount: number;
  verifiedAmount: string; // decimal string, SUM(amount) WHERE VERIFIED
  byStatus: Record<'RECORDED' | 'VERIFIED' | 'VOIDED', number>;
  currency: 'VND'; // MVP: single-currency rollup
}

interface WidgetoSummary {
  generatedAt: string; // ISO
  customers: WidgetoCustomersStats;
  orders: WidgetoOrdersStats;
  payments: {
    totalCount: number;
    verifiedCount: number;
    verifiedAmount: string;
    byStatus: Record<'RECORDED' | 'VERIFIED' | 'VOIDED', number>;
  };
}
```

`GET /widgeto/summary` — `payments` **không** có `currency` (field đó chỉ trên `/widgeto/payments`).

---

## GET `/widgeto/summary`

**Response** → `WidgetoSummary`

```bash
curl -s "http://localhost:3000/api/v1/widgeto/summary" \
  -H "X-Widgeto-Key: $WIDGETO_API_KEY"
```

---

## GET `/widgeto/customers`

**Response** → `WidgetoCustomersStats`

Nguồn: `customers.status` (string tự do).

---

## GET `/widgeto/orders`

**Response** → `WidgetoOrdersStats`

Nguồn: `orders.stage` (string tự do, không enum).

---

## GET `/widgeto/payments`

**Response** → `WidgetoPaymentsStats`

- `verifiedAmount` = `SUM(amount)` với `verificationStatus = VERIFIED`  
- MVP: `currency: "VND"` (không tách multi-currency)

---

## Errors

| Code | When |
|------|------|
| 400 | `from` / `to` không parse được ISO |
| 401 | Thiếu / sai `X-Widgeto-Key` hoặc `WIDGETO_API_KEY` chưa cấu hình |
| 500 | Unexpected |

Shape lỗi giống các API khác (`success: false`, `statusCode`, `error[]`).

---

## Env

| Var | Required | Notes |
|-----|----------|--------|
| `WIDGETO_API_KEY` | yes (prod) | Shared secret; set trên Railway Variables |

Local: thêm vào `apps/backend/.env` (xem `.env.example`).

---

## Not in this slice

- Leads / expenses / realtime  
- JWT user / data-scope OWN  
- Multi-currency breakdown  
- Rate limit nâng cao
