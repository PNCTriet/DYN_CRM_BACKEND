# Database ↔ Domain Traceability Matrix

> Source: [`schema.sql`](./schema.sql) · Design: [`SchemaDesign.md`](./SchemaDesign.md)

| Domain | Entity | DB Table | Main Owner | Key FK | API Ready |
|--------|--------|----------|------------|--------|-----------|
| Identity | User | users | Identity | auth_subject_id | Foundation |
| Identity | Role | roles | Identity | — | Foundation |
| Identity | Permission | permissions | Identity | code | Foundation |
| Identity | PermissionGroup | permission_groups | Identity | — | Foundation |
| Identity | UserRole | user_roles | Identity | user_id, role_id | Foundation |
| Identity | RolePermissionGroup | role_permission_groups | Identity | role_id, group_id | Foundation |
| Identity | GroupPermission | group_permissions | Identity | group_id, permission_id | Foundation |
| CRM | Lead | leads | CRM | owner_id | Phase C |
| CRM | Customer | customers | CRM | owner_id | **Yes (first slice)** |
| CRM | Contact | contacts | CRM | customer_id, lead_id | Phase C |
| CRM | CustomerFollower | customer_followers | CRM | customer_id, user_id | Phase C |
| CRM | Note | notes | CRM | subject_* | Phase C |
| CRM | Activity | activities | CRM | subject_* | Phase C |
| CRM | ImportBatch | import_batches | CRM | created_by | Phase C |
| CRM | ImportRow | import_rows | CRM | batch_id | Phase C |
| Service | Service | services | Service | — | Phase D |
| Collaboration | Collaborator | collaborators | Collaboration | user_id | Phase G |
| Collaboration | CollaboratorCustomer | collaborator_customers | Collaboration | collaborator_id, customer_id | Phase G |
| Collaboration | ContractRequest | contract_requests | Collaboration | collaborator_id | Phase G |
| Legal | Contract | contracts | Legal | customer_id | Phase E |
| Legal | WorkflowTemplate | workflow_templates | Legal | — | Phase E |
| Legal | WorkflowStage | workflow_stages | Legal | template_id | Phase E |
| Legal | StageRequirement | stage_requirements | Legal | stage_id | Phase E |
| Legal | WorkflowInstance | workflow_instances | Legal | contract_id | Phase E |
| Legal | Task | tasks | Legal | contract_id | Phase E |
| Legal | DocumentMetadata | document_metadata | Legal | contract_id / order_id | Phase E |
| Finance | Order | orders | Finance | contract/customer/service | Phase F |
| Finance | PaymentSchedule | payment_schedules | Finance | order_id | Phase F |
| Finance | PaymentScheduleLine | payment_schedule_lines | Finance | schedule_id | Phase F |
| Finance | Payment | payments | Finance | order_id | Phase F |
| Finance | VatInvoice | vat_invoices | Finance | order_id | Phase F |
| Finance | Expense | expenses | Finance | order_id | Phase F |
| Finance | Commission | commissions | Finance | order_id, payment_id | Phase F |
| Communication | Notification | notifications | Communication | recipient_user_id | Phase H |
| Communication | Reminder | reminders | Communication | recipient_user_id | Phase H |
| Communication | OutboundEmailLog | outbound_email_logs | Communication | related_notification_id | Phase H |
| System | AppConfig | app_config | System | key | Phase H |

**Non-tables:** Debt (derived), Income (use Payment/Thu view), Payroll, SePay*.
