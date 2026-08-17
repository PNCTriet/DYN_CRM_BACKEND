# Business Capability Map — DYN CRM

> Vietnamese version: [BusinessCapabilityMap.vi.md](./BusinessCapabilityMap.vi.md)

## 1. Purpose

Provide a single map of business capabilities, end-to-end value streams, and domain ownership so readers understand the platform before diving into each domain document.

## 2. Scope

| In scope | Out of scope |
|----------|--------------|
| Capability catalog and relationships | Entity field catalogs |
| E2E flows across domains | UI wireframes |
| Mapping to Phase 01 modules | Infrastructure vendors |

## 3. Business Capability

### 3.1 Capability catalog

| Capability | Document | Primary Phase 01 module |
|------------|----------|-------------------------|
| Identity & access | Identity.md | Identity |
| CRM acquisition & customer master | CRM.md | CRM |
| Collaborator (CTV) partnership | Collaboration.md | **SUPERSEDED 2026-08-17** — not a Phase 03 module |
| Legal delivery | LegalOperation.md | Legal |
| Money (thu/chi, payment, invoice) | Finance.md | Finance |
| Notifications & email | Communication.md | System |

### 3.2 Capability map

```mermaid
flowchart TB
  subgraph acquire [Acquire]
    CRM[CRM]
  end
  subgraph deliver [Deliver]
    LEG[LegalOperation]
  end
  subgraph money [Money]
    FIN[Finance]
  end
  subgraph access [Access]
    ID[Identity]
  end
  subgraph signal [Signal]
    COM[Communication]
  end
  ID --> CRM
  ID --> LEG
  ID --> FIN
  CRM --> LEG
  LEG --> FIN
  CRM --> COM
  LEG --> COM
  FIN --> COM
```

Collaboration/CTV is **not** on the implementation map until S6 is reversed.

## 4. Actors (platform-level)

| Actor | Type | Primary capabilities |
|-------|------|----------------------|
| Super Admin / Admin | Internal | Identity, configuration |
| Manager | Internal | Oversight across CRM/Legal/Finance |
| Sales | Internal | CRM |
| Lawyer / Legal Assistant | Internal | LegalOperation |
| Accounting | Internal | Finance |
| Collaborator (CTV) | External | **Not a login actor** unless S6 reversed; money via Finance thu/chi or note |
| Customer (party) | External | Not a system login in MVP unless later decided |

## 5. Business Lifecycle — platform value chain

```mermaid
flowchart LR
  Lead[Lead] --> Customer[Customer]
  Customer --> Contract[Official_Contract]
  Contract --> Workflow[Configurable_Workflow]
  Contract --> Order[Order]
  Order --> Schedule[Payment_Schedule]
  Schedule --> Payment[Payment]
  Payment --> Debt[Debt_view]
  Payment --> Invoice[VAT_Invoice]
  Order --> Expiry[Order_expiry_alert]
  Invoice --> InvAlert[Invoice_alert]
```

> **Locked (2026-08-03):** Invoice **after** Payment. **2026-08-17:** CTV Collaboration expansion **SUPERSEDED**. Commission / CTV portal **not** on this chain until re-locked. Thu/Chi tabs sit in Finance (model OPEN).

## 6. Main Business Objects (cross-domain)

| Object | Owning capability |
|--------|-------------------|
| Lead, Customer, Contact | CRM |
| Contract, Workflow, Task, Document | LegalOperation |
| Order, Payment Schedule, Payment, Debt, VAT Invoice, Thu/Chi (OPEN) | Finance |
| User, Role, Permission | Identity |
| Notification, Reminder, Email message | Communication |

## 7. Business Rules (platform)

1. Glossary English terms are canonical in all domain docs.  
2. Lead is a separate entity from Customer (Phase 00).  
3. Official Contract is created by staff. CTV portal / Contract Request is **not** MVP unless S6 reversed.  
4. Invoice after Payment (Phase 00). Commission only if re-locked.  
5. Workflow is template-based, not BPMN; Kanban columns are configurable **data**.  
6. Authorization is NestJS RBAC with `resource.action` permissions (Phase 01).  
7. Contract number is unique.

## 8. Permission Matrix (capability-level)

| Capability | Staff roles (typical) | CTV |
|------------|----------------------|-----|
| CRM | Sales, Manager, Admin, Lawyer (read as needed) | N/A (portal removed) |
| LegalOperation | Lawyer, Legal Assistant, Manager, Admin | N/A |
| Finance | Accounting, Manager, Admin, Chi approver | N/A |
| Identity | Admin, Super Admin | N/A |
| Communication | System-driven + role inboxes | N/A |

Detailed matrices live inside each domain doc.

## 9. Business Events (platform)

| Event | From | To |
|-------|------|-----|
| LeadConverted | CRM | Legal / Communication |
| ContractSigned | Legal | Finance / Communication |
| PaymentCollected | Finance | Communication |
| InvoiceIssued | Finance | Communication |
| OrderExpiringSoon | Finance | Communication |
| WorkflowStageCompleted | Legal | Communication |
| TaskOverdue | Legal | Communication |

## 10. Interaction with Other Domains

See §3.2 and each domain §10. Infrastructure (AuthPort, StoragePort, QueuePort) is Phase 01 — not redrawn here.

## 11. Future Extension

| Extension | Notes |
|-----------|-------|
| Practice-area packs | Labor, Civil, Business, IP, Litigation |
| SePay via PaymentProviderPort | Finance MVP **candidate** (boundary OPEN) |
| Multi-tenant | Identity + all masters |
| Marketing automation | Explicitly out — Communication stays transactional |

## 12. Mermaid Diagrams

### 12.1 Swimlane E2E (staff)

```mermaid
sequenceDiagram
  participant Sales
  participant Legal
  participant Accounting
  Sales->>Sales: Import_or_create_Lead
  Sales->>Sales: Convert_to_Customer
  Legal->>Legal: Official_Contract
  Legal->>Legal: Start_Workflow
  Accounting->>Accounting: Order_Schedule_Payment_Invoice
```

CTV swimlane removed pending S6 re-lock.

### 12.2 Domain dependency (acyclic intent)

```mermaid
flowchart BT
  COM[Communication]
  FIN[Finance]
  LEG[LegalOperation]
  CRM[CRM]
  ID[Identity]
  FIN --> LEG
  LEG --> CRM
  CRM --> ID
  LEG --> ID
  FIN --> ID
  COM --> ID
```

## 13. Open Questions

1. Is “Customer” ever a login principal in MVP? (Assumed no.)  
2. Schema-critical lists: see OVERVIEW.md and each domain §13 (CTV S6, Thu/Chi, Kanban Stage vs Status, SePay, Order dates/statuses, Customer date).

## 14. TODO

- [x] Close Invoice-vs-Payment (2026-08-03)  
- [x] Record CTV Collaboration expansion **SUPERSEDED** (2026-08-17)  
- [ ] Stakeholder re-lock 2026-08-17 items  
- [ ] Trace each capability to Phase 03 aggregate list (skip Collaboration unless restored)  
