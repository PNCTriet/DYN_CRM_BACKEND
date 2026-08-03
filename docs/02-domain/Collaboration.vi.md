# Collaboration — DYN CRM

> Bản tiếng Việt của [Collaboration.md](./Collaboration.md). Canonical: English.

## 1. Mục đích

Định nghĩa năng lực **Collaboration**: nhân sự hợp tác với **CTV** qua portal hạn chế — gồm khách được gán và Contract Request (đã khóa mở rộng 2026-08-03).

## 2. Phạm vi

Portal CTV; vòng đời Contract Request; bàn giao Legal/Finance/Commission. Ngoài: full CRM; CTV tự tạo Official Contract; BPMN.

## 3. Năng lực nghiệp vụ (đã khóa)

| Năng lực | Trạng thái |
|----------|------------|
| Login CTV | Locked |
| Portal hạn chế (không full CRM) | Locked |
| Quản lý khách **được gán** | **Locked 2026-08-03** |
| Gửi Contract Request → staff duyệt → Official Contract | **Locked 2026-08-03** |
| Xem hoa hồng của mình | Locked |
| Cập nhật profile | Locked |

CTV **không** tự tạo Official Contract; không vào module CRM/Legal/Finance nhân sự.

## 4–12

Giữ nội dung/sơ đồ như bản English (lifecycle, objects, rules, permissions với `contract_request.*` và `customer.*_assigned_ctv` = **Y** cho CTV trong scope).

## 13. Open Questions

1. Neo attribution referral?  
2. Ai được approve Request ngoài Lawyer/Admin?  
3. Field bắt buộc Request?  
4. Một request → nhiều Contract?  
5. Onboarding CTV chỉ admin invite?  
6. Ai gán khách cho CTV; CTV có tạo Customer không?

## 14. TODO

- [x] Stakeholder chấp nhận mở rộng Collaboration (2026-08-03)  
- [x] Cập nhật Scope  
- [ ] Khóa attribution / field Request / rule gán khách  
