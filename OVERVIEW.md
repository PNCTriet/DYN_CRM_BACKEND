# DYN CRM — Project Overview

> Cập nhật: **2026-08-03** — Phase 02 delivered; **2 quyết định chặn schema đã khóa**

---

## Tiến độ

| Phase | Status |
|-------|--------|
| 00 — Project | ✅ Locked (re-synced 2026-08-03) |
| 01 — Architecture | ✅ Locked |
| 02 — Domain | ✅ Delivered + **CTV / Finance chain locked** |
| 03 — Database | ⏳ Next |
| 04+ / Code | ⏳ |

---

## Quyết định vừa khóa (2026-08-03)

1. **CTV — mở rộng Collaboration**  
   Portal: referral, khách **được gán**, Contract Request, hoa hồng của mình, profile.  
   Không tạo Official Contract; không full CRM nhân sự.

2. **Chuỗi tiền**  
   `Contract → Order → Payment Schedule → Payment → Debt → VAT Invoice → Commission`  
   **Hóa đơn VAT sau Payment.**

Docs đã cập nhật: `Scope` (+VI), `Glossary` (+VI), `Roadmap`, `Architecture`, `Collaboration`, `Finance`, `BusinessCapabilityMap`.

---

## Open Questions còn lại (không chặn 2 quyết định trên)

- Attribution referral / field Contract Request / ai gán khách CTV  
- Cancelled matrix + Contract vs Workflow complete  
- Debt model; commission Recorded vs Verified  
- Lead status / duplicate / convert map  

---

## Điểm vào

- Phase 02: [`docs/02-domain/README.md`](./docs/02-domain/README.md)  
- Scope: [`docs/00-project/Scope.md`](./docs/00-project/Scope.md)  
