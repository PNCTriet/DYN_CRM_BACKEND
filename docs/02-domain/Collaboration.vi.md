# Collaboration — DYN CRM

> Bản tiếng Việt của [Collaboration.md](./Collaboration.md). Canonical: English.

## Thay đổi phạm vi — 2026-08-17 (CẦN KHÓA LẠI)

Phản hồi stakeholder: **loại bỏ hẳn thông tin vận hành CTV**; chỉ ghi **khoản thu/chi (hoặc note) liên quan CTV** khi có tiền.

Mô hình portal khóa 2026-08-03 **SUPERSEDED — không implement**. Giữ phụ lục lịch sử để thay đổi tường minh.

| Năng lực cũ (2026-08-03) | Lập trường đề xuất 2026-08-17 |
|--------------------------|-------------------------------|
| Portal CTV | **Gỡ** trừ khi duyệt lại |
| Khách được gán | **Gỡ** |
| Contract Request + staff duyệt | **Gỡ** |
| Attribution referral | **Gỡ** |
| Xem hoa hồng trên portal | **Gỡ** (tiền có thể ghi ở Finance) |
| Profile / role `COLLABORATOR` | **Gỡ** trừ khi Identity duyệt lại |
| Domain Collaboration vận hành | **Không** vào thứ tự aggregate Phase 03 trừ khi xác nhận lại |
| Tiền liên quan CTV | **Finance** thu/chi hoặc note |

**Giữ mơ hồ:** “khoản thu chi cho CTV” chưa chốt Thu, Chi, cả hai, hay note không hạch toán. Xem Open Questions Finance.

## 1. Mục đích

Ghi lập trường CTV giản lược: không domain vận hành CTV trong MVP trừ khi duyệt lại. Tiền CTV thuộc Finance.

## 2. Phạm vi

Trong: con trỏ sang Finance cho thu/chi CTV; danh sách năng lực đã gỡ. Ngoài: portal, khách gán, Contract Request, đồ thị referral.

## 3. Năng lực (đề xuất)

CTV không còn actor vận hành. Staff tạo Official Contract (Legal). Tiền CTV → Finance (ngữ nghĩa **OPEN**).

## 4–12

Như bản English: không lifecycle Collaboration; không permission portal; không event Contract Request.

## 13. Open Questions

1. Xác nhận **gỡ** portal / Request / khách gán / role Collaborator (schema-critical).  
2. “Khoản thu chi cho CTV” là **Chi**, **Thu**, cả hai, hay **note**?  
3. Chỉ cần tên người nhận / ghi chú, hay vẫn cần master CTV?  
4. **Commission** còn là object Finance hay bỏ cùng portal?

## 14. TODO

- [ ] Khóa S6 vào Scope Phase 00 (EN/VI)  
- [x] Đánh dấu mở rộng Collaboration 2026-08-03 là SUPERSEDED (2026-08-17)  
- [ ] Sau khi khóa: gỡ `COLLABORATOR` khỏi Glossary **hoặc** khôi phục portal  
- [ ] Loại Collaboration khỏi thứ tự aggregate Phase 03 đến khi xác nhận lại  

## 15–23

Không aggregate Collaboration trong MVP đề xuất. Ownership tiền CTV → Finance.

## Phụ lục A — Mô hình lịch sử (2026-08-03) — SUPERSEDED — KHÔNG IMPLEMENT

Portal hạn chế; khách gán; Contract Request; hoa hồng của mình; profile; staff duyệt trước Official Contract. Chi tiết đầy đủ nằm trong git history trước 2026-08-17.
