# Catalog aggregate — Phase 03 (hướng database)

> Bản tiếng Việt của [AggregateCatalog.md](./AggregateCatalog.md). Canonical: English.  
> Schema logic: [SchemaDesign.vi.md](./SchemaDesign.vi.md)

Không Prisma DSL. **Không Collaboration.**

## Identity

Root: User. Entity: User, Role, Permission, PermissionGroup, UserRole, RolePermissionGroup, GroupPermission.  
FK: chỉ inbound `userId`. Unique: `authSubjectId`, `Permission.code`.  
Map: Supabase `sub` → `User.authSubjectId`; domain dùng `User.id`.  
**OPEN:** PermissionGroup bắt buộc? Seed `COLLABORATOR`? Map duyệt Chi (“Nhi”)?  
**Giả định:** có Group (Phase 02 khuyến nghị). Không RolePermission trực tiếp ở draft đầu.

## CRM

Root: Lead, Customer, ImportBatch. Entity thêm: Contact, CustomerFollower, Note, Activity, ImportRow.  
Lead ≠ Customer. Owner đúng 1. Không UNIQUE name/phone/email. Không cột ngày khách. Không flag `hasUsedService` — **derive**.  
**OPEN:** status Lead; duplicate; map convert; Contact trên Lead; catalog lĩnh vực; nghĩa cột ngày.

## Legal

Root: Contract, WorkflowTemplate, WorkflowInstance, Task, DocumentMetadata.  
`contractNumber` UNIQUE (kể cả partial unique nếu soft-delete). Kanban = **dòng** WorkflowStage, không Prisma enum. Contract.status = lifecycle Glossary (tách).  
**OPEN:** Kanban = Stage hay Status? Sinh số vs nhập tay? Nhiều instance / Contract?

## Finance

Root draft: Order, Payment, VatInvoice, Expense.  
Không: Commission, Income, Debt table, Sepay*, portal CTV.  
Order sở hữu serviceStart/serviceEnd; N tháng hết hạn nằm **AppConfig**, không cột Order. Status Order = string, **không** enum bịa. Payment method enum đã khóa. provider* opaque. Invoice.orderId bắt buộc; paymentId **nullable** (cardinality OPEN).  
Thu = query Payment (**giả định**). Chi = bảng Expense. Debt = derive (**giả định**). Commission tách, không chặn CRM/Legal.

## Communication

Notification, Reminder (OPEN persist vs job), OutboundEmailLog, AppConfig.  
Không nhúng logic gửi vào bảng Finance/Legal.

## Cố ý không có

CollaboratorProfile, ContractRequest, Referral, AssignedCustomer, Commission bắt buộc, Income, Debt, SepayPayment, Organization/Department MVP, cột ngày Customer, flag used-service.
