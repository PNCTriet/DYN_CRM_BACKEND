# Communication — DYN CRM

> Vietnamese version: [Communication.vi.md](./Communication.vi.md)

## 1. Purpose

Define the **Communication** capability: internal notifications/reminders/workflow alerts and external transactional email — **not** marketing automation.

## 2. Scope

| In scope | Out of scope |
|----------|--------------|
| In-app Notification | Marketing campaigns / automation |
| Reminder (tasks, schedules) | SMS / Zalo (unless later scoped) |
| Workflow notifications | Push mobile OS (unless later) |
| Transactional Email (Resend via MailPort) | Newsletter blasts |

## 3. Business Capability

### Internal

| Capability | Trigger examples |
|------------|------------------|
| Notification | Assignment, request status, payment recorded |
| Reminder | Task due, payment schedule due, **Order expiring (N months)**, **invoice alert** |
| Workflow notification | Stage entered, requirement blocked |

### External

| Capability | Trigger examples |
|------------|------------------|
| Email | Auth-related, payment receipts (if approved), staff digests |
| Customer notification | Only if product later allows customer email — Open Question |

## 4. Actors

| Actor | Inbox |
|-------|-------|
| All authenticated staff | Own notifications |
| System / Worker | Emits messages via events |

CTV portal inbox is **out** unless Collaboration is restored (2026-08-17).

Customers are **not** assumed to have logins in MVP (BusinessCapabilityMap Open Question).

## 5. Business Lifecycle

### Notification

```mermaid
stateDiagram-v2
  [*] --> Unread
  Unread --> Read
  Read --> Archived
  Unread --> Archived
```

### Reminder

```mermaid
flowchart TD
  Source[Task_or_Schedule] --> Due[Due_Approaching]
  Due --> Notify[Create_Notification]
  Due --> Email[Optional_Email]
```

## 6. Main Business Objects

| Object | Meaning |
|--------|---------|
| Notification | In-app alert for a user |
| Reminder | Time-based intent tied to Task/Schedule |
| Email message (outbound log) | Record that MailPort was invoked |
| Notification preference | Optional per-user settings — Open Question for MVP depth |

## 7. Business Rules

1. No marketing automation in MVP (brief).  
2. Notifications are event-driven from CRM / Legal / Finance / Identity (Collaboration only if restored).  
3. Reminders support Workflow tasks, payment schedule dues, **Order expiration (configurable N months)**, and **invoice alerts**.  
4. Email goes through MailPort (Resend adapter) — domain does not couple to vendor (Phase 01).  
5. Do not put secrets in email/notification bodies.  
6. Finance and Legal **must not** implement notification delivery — they emit events only.

## 8. Permission Matrix

| Permission (illustrative) | All users | Admin |
|---------------------------|-----------|-------|
| `notification.read_own` | Y | Y |
| `notification.manage_all` | N | Y |
| `email.template.manage` | N | Y |

## 9. Business Events (consumed)

| Upstream event | Communication action |
|----------------|----------------------|
| `LeadAssigned` | Notify assignee |
| `ContractStatusChanged` | Notify watchers / owner |
| `TaskOverdue` | Reminder + notify assignee |
| `PaymentCollected` | Notify accounting |
| `InvoiceIssued` | Invoice alert (CONFIRMED capability) |
| `InvoiceDueSoon` | **Only if** invoice due date exists |
| `InvoiceOverdue` | **OPEN** whether required |
| `OrderExpiringSoon` | Staff alert N months before Order `serviceEnd` |
| `ExpenseSubmitted` | Notify Chi approver (“Nhi” mapping OPEN) |
| `UserInvited` | Email invite (if used) |

`ContractRequestSubmitted` is **not** consumed unless Collaboration is restored.

## 10. Interaction with Other Domains

```mermaid
flowchart TB
  CRM --> COM[Communication]
  LEG[LegalOperation] --> COM
  FIN[Finance] --> COM
  ID[Identity] --> COM
  COM --> MailPort[MailPort]
  COM --> Queue[QueuePort_async]
```

Delivery is typically async via worker (Phase 01).

## 11. Future Extension

| Item | Notes |
|------|-------|
| Customer-facing email templates | If customers remain non-users |
| SMS / Zalo | New channel ports |
| Digest emails | Manager daily summary |
| Marketing automation | Explicitly rejected for now |

## 12. Mermaid Diagrams

### 12.1 Event to inbox

```mermaid
sequenceDiagram
  participant LEG as LegalOperation
  participant BUS as Domain_Event
  participant W as Worker
  participant COM as Communication
  participant User
  LEG->>BUS: TaskOverdue
  BUS->>W: job
  W->>COM: Create_Notification
  COM-->>User: In_app
  W->>COM: Optional_Email
```

### 12.2 Channels

```mermaid
flowchart LR
  Events[Domain_Events] --> InApp[InApp_Notification]
  Events --> Mail[Transactional_Email]
```

## 13. Open Questions

### Schema-critical (light)

1. Persist reminder rows for Order expiry and invoice due, or compute from source dates at job time? (affects Reminder table vs job-only)

### Non-schema-critical

2. Which emails are mandatory in MVP (auth only vs payment receipts vs invoice/expiry alerts)?  
3. User notification preferences in MVP or later?  
4. Are Customers emailed without portal accounts?  
5. Retention period for notifications?  
6. Who receives invoice alerts and Order-expiry alerts? In-app vs email?  
7. Is `InvoiceOverdue` required? Is the due-soon threshold configurable?  
8. Real-time transport (polling vs websocket) — implementation choice unless product cares.

## 14. TODO

- [ ] Lock MVP email template list with product  
- [ ] Lock which events create in-app vs email  
- [ ] Lock invoice + Order-expiry alert recipients and thresholds  
- [x] Drop CTV portal notification catalog unless Collaboration restored (2026-08-17)  
- [ ] Confirm reminder lead times (tasks e.g. 24h; Order expiry = N months from Finance config)  

## 15. Aggregate Boundaries

| Aggregate Root | Children / parts | Boundary rule |
|----------------|------------------|---------------|
| **Notification** | Read/unread/archive state; recipient user | Owned per user inbox |
| **Reminder** | Source ref (Task/Schedule), due window | Intent to notify — does not own Task/Schedule |
| **Outbound Email log** | Template key, recipient, delivery status | Record of MailPort invocation |
| **Notification preference** | Optional per-user settings | Open Q for MVP depth |

## 16. Domain Invariants

| ID | Invariant |
|----|-----------|
| COM-I1 | No marketing automation in MVP |
| COM-I2 | Notifications are event-driven — Communication does not invent upstream business state |
| COM-I3 | Secrets must not appear in notification/email bodies |
| COM-I4 | Email delivery goes through MailPort — domain does not own vendor coupling |
| COM-I5 | Finance/Legal do not send notifications — they emit events |

## 17. Primary Business Use Cases

| ID | Use case |
|----|----------|
| UC01 | Create in-app Notification from domain event |
| UC02 | Mark Notification read / archive |
| UC03 | Schedule Reminder for Task / Payment Schedule / Order expiry / Invoice |
| UC04 | Send transactional Email |
| UC05 | Admin manage email templates (MVP depth Open Q) |

## 18. Ownership Matrix

| Business Object | Owner Domain | Referenced By |
|-----------------|--------------|---------------|
| Notification | Communication | All domains (produce events) |
| Reminder | Communication | Legal (Task), Finance (Schedule, Order expiry, Invoice) |
| Outbound Email log | Communication | Monitoring |
| Email template (business content) | Communication | Identity (auth emails) |

## 19. Domain Event Matrix

| Event (consumed) | Producer | Communication action |
|-------------------|----------|----------------------|
| `LeadAssigned` | CRM | Notify assignee |
| `ContractStatusChanged` | Legal | Notify watchers / owner |
| `TaskOverdue` | Legal | Reminder + notify |
| `PaymentCollected` | Finance | Notify accounting |
| `InvoiceIssued` | Finance | Invoice alert |
| `InvoiceDueSoon` / `InvoiceOverdue` | Finance | If due date / overdue policy locked |
| `OrderExpiringSoon` | Finance | Staff expiry alert |
| `ExpenseSubmitted` | Finance | Notify Chi approver |
| `UserInvited` | Identity | Email invite (if used) |

Communication is primarily a **consumer**; it may emit delivery/failure signals for Monitoring (not business domain events).

## 20. Business Constraints

| Constraint |
|------------|
| Do not send marketing blasts |
| Failed email must be observable (Monitoring) — no silent drop of mandatory auth mail |
| User sees own notifications only (unless admin manage-all) |
| Reminder does not mutate Task/Payment Schedule ownership |

## 21. Dynamic Features

| Feature | Stance |
|---------|--------|
| Event → channel mapping | Configurable catalog later; MVP list locked in TODO |
| Templates | Admin-managed transactional templates |
| Channels | In-app + Email MVP; SMS/Zalo later |

## 22. Business Metrics

| Metric | Purpose |
|--------|---------|
| Notification delivery volume | System load / engagement |
| Email failures | Reliability |
| Unread backlog | Attention risk |
| Reminder firing rate | Operational cadence |

## 23. Cross Domain Dependency

| | Domains |
|--|---------|
| **Depends on** | Identity; consumes events from CRM, Legal, Finance |
| **Provides to** | Users (inbox), Monitoring (delivery health) |
| **Does not own** | Upstream business lifecycles |
