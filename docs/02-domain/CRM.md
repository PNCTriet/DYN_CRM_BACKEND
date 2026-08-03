# CRM — DYN CRM

> Vietnamese version: [CRM.vi.md](./CRM.vi.md)

## 1. Purpose

Define the **CRM** business capability: acquiring and managing Leads, converting to Customers, maintaining Contacts, assignment, follow-up, activity history, and the foundation for search/filter/analytics — without implementation detail.

## 2. Scope

| In scope | Out of scope |
|----------|--------------|
| Lead / Customer / Contact lifecycles | Official Contract issuance (LegalOperation) |
| Excel import pipeline (MVP) | Metadata mapping engine |
| Owner / Followers, notes, timeline | Payment and commission |
| Search/filter/analytics *foundation* | Full BI warehouse |

## 3. Business Capability

| Capability | MVP |
|------------|-----|
| Lead import (Excel template) | Yes |
| Lead management & qualification | Yes |
| Lead assignment | Yes |
| Customer management (Individual / Company) | Yes |
| Contact management | Yes |
| Follow-up | Yes |
| Timeline / activity history / notes | Yes |
| Search & filter | Yes |
| Analytics foundation | Yes (basic counts/pipelines — not full BI) |

### Lead sources (locked list for MVP)

| Source |
|--------|
| Facebook |
| Google |
| Website |
| Landing Page |
| Referral |
| Excel |
| Manual |

## 4. Actors

| Actor | CRM role |
|-------|----------|
| Sales | Primary create/qualify/convert/import |
| Manager | Oversight, reassignment |
| Admin | Configuration support |
| Lawyer / Legal Assistant | Often read/follow after conversion |
| Accounting | Read as needed for billing context |
| CTV | **No full CRM** per Phase 00 (see Collaboration for portal scope) |

## 5. Business Lifecycle

### 5.1 Lead → Customer

```mermaid
stateDiagram-v2
  [*] --> NewLead: Create_or_Import
  NewLead --> InProgress: Working
  InProgress --> Qualified: Qualify
  Qualified --> Converted: Convert_to_Customer
  InProgress --> Disqualified: Disqualify
  NewLead --> Disqualified: Disqualify
  Converted --> [*]
  Disqualified --> [*]
```

> Exact Lead status enum beyond Qualified/Converted/Disqualified → Open Questions.

### 5.2 Customer

```mermaid
stateDiagram-v2
  [*] --> Active: Created_from_Lead_or_Manual
  Active --> Inactive: Deactivate
  Inactive --> Active: Reactivate
```

### 5.3 Excel import pipeline (MVP)

```mermaid
flowchart TD
  T[Excel_Template] --> V[Validation]
  V --> D[Duplicate_Detection]
  D --> P[Preview]
  P --> A[Assign_Owner]
  A --> I[Import]
  I --> L[Leads_Created]
```

**Extension point:** future dynamic column mapping. **Do not** build a metadata engine in MVP.

## 6. Main Business Objects

| Object | Meaning |
|--------|---------|
| Lead | Prospective client before Customer (separate entity — Phase 00) |
| Customer | Individual or Company client master |
| Contact | Person linked to Customer (and optionally Lead) |
| Owner | Exactly one primary responsible user per Customer |
| Follower | Optional additional users following a Customer |
| Note | Free-text business note on Lead/Customer |
| Activity / Timeline entry | Chronological CRM-relevant facts |
| Import batch | Record of an Excel import run |

## 7. Business Rules

1. Lead ≠ Customer; conversion is an explicit action (Phase 00).  
2. Customer types: Individual | Company (Phase 00).  
3. Every Customer has exactly **one** Owner; Followers optional (Phase 00).  
4. Duplicate detection runs before import commit (rules for match keys → Open Questions).  
5. Import must assign Owner before commit (MVP flow).  
6. Referral source may link to Collaboration/CTV (attribution model still Open Question).  
7. CTV has scoped assigned-customer access via Collaboration portal — not full CRM (locked 2026-08-03).

## 8. Permission Matrix

| Permission (illustrative) | Sales | Manager | Admin | Lawyer | CTV |
|---------------------------|-------|---------|-------|--------|-----|
| `lead.read` | Y | Y | Y | Y | N |
| `lead.write` | Y | Y | Y | Limited/Open Q | N |
| `lead.import` | Y | Y | Y | N | N |
| `lead.convert` | Y | Y | Y | Open Q | N |
| `customer.read` | Y | Y | Y | Y | N* |
| `customer.write` | Y | Y | Y | Open Q | N |
| `contact.write` | Y | Y | Y | Open Q | N |

\*CTV sees **assigned** customers only via Collaboration portal (locked 2026-08-03) — not full CRM.

Owner vs Follower write rights: baseline in Security.md; **final lock still Open Question**.

## 9. Business Events

| Event | When |
|-------|------|
| `LeadCreated` | Manual or import |
| `LeadAssigned` | Owner/assignee set |
| `LeadQualified` | Qualification action |
| `LeadConverted` | Customer created from Lead |
| `LeadDisqualified` | Closed lost |
| `CustomerCreated` | Convert or manual |
| `CustomerOwnerChanged` | Reassignment |
| `ImportCompleted` | Batch finished |
| `NoteAdded` / `ActivityRecorded` | Timeline |

## 10. Interaction with Other Domains

```mermaid
flowchart LR
  CRM[CRM] --> ID[Identity]
  CRM --> LEG[LegalOperation]
  CRM --> COL[Collaboration]
  CRM --> COM[Communication]
  COL -.->|referral_source| CRM
```

| Domain | Interaction |
|--------|-------------|
| Identity | Owner / Follower users |
| LegalOperation | Customer referenced by Contract |
| Collaboration | Assigned customers / referral anchors (locked Collaboration expansion) |
| Finance | Customer on Order/Invoice |
| Communication | Follow-up reminders, assignment notices |

## 11. Future Extension

| Item | Notes |
|------|-------|
| Dynamic import mapping UI | Extension point only in MVP |
| Merge duplicate tool | Post-MVP |
| Practice-area tags on Customer | With legal specialization |
| Full analytics warehouse | Out of MVP |

## 12. Mermaid Diagrams

### 12.1 Convert sequence

```mermaid
sequenceDiagram
  participant Sales
  participant CRM
  participant ID as Identity
  Sales->>CRM: Convert_qualified_Lead
  CRM->>ID: Validate_Owner_user
  CRM->>CRM: Create_Customer_plus_Contacts_copy_policy
  CRM->>CRM: Mark_Lead_Converted
  CRM-->>Sales: Customer_id
```

### 12.2 Objects (conceptual)

```mermaid
classDiagram
  class Lead {
    source
    status
    assignee
  }
  class Customer {
    type
    owner
  }
  class Contact {
    name
    phone
    email
  }
  Lead --> Customer : converts_to
  Customer "1" --> "*" Contact
  Customer "1" --> "1" Owner
  Customer "1" --> "*" Follower
```

### 12.3 Import journey

```mermaid
journey
  title Excel Lead Import
  section Prepare
    Download template: 5: Sales
    Fill rows: 4: Sales
  section Import
    Upload validate: 3: Sales
    Resolve duplicates: 2: Sales
    Preview assign owner: 3: Sales
    Commit: 5: Sales
```

## 13. Open Questions

1. Full Lead status set (beyond New / InProgress / Qualified / Converted / Disqualified)?  
2. Duplicate match keys (phone, email, tax id, name+phone)? Soft warn vs hard block?  
3. On convert: which Lead fields map to Customer/Contact?  
4. Can Contact exist on Lead before conversion?  
5. Owner vs Follower exact write permissions?  
6. May Lawyers convert leads?  
7. Referral Lead → mandatory CTV link?

## 14. TODO

- [ ] Lock Lead status enum  
- [ ] Lock duplicate policy  
- [ ] Lock conversion field map  
- [ ] Publish Excel template column list  
- [x] CTV assigned-customer visibility aligned with Collaboration lock (2026-08-03)

## 15. Aggregate Boundaries

| Aggregate Root | Children / parts (business ownership) | Boundary rule |
|----------------|----------------------------------------|---------------|
| **Lead** | Lead notes, lead timeline/activities, import-batch membership | Lead changes stay inside Lead; conversion *creates* Customer aggregate |
| **Customer** | Contacts, notes, timeline/activities, Followers | Exactly one Owner; Followers do not own the aggregate |
| **ImportBatch** | Validated rows pending commit | Batch owns preview/duplicate decisions until commit spawns Leads |

Contacts must not exist as orphan masters without a Customer (unless Open Q allows Lead-only contacts before convert).

## 16. Domain Invariants

| ID | Invariant |
|----|-----------|
| CRM-I1 | Customer always has exactly **one** Owner |
| CRM-I2 | Customer `type` is mandatory (Individual \| Company) |
| CRM-I3 | A Lead cannot be converted more than once |
| CRM-I4 | Converted Lead cannot be converted again |
| CRM-I5 | Lead and Customer remain distinct entities |
| CRM-I6 | Import commit requires Owner assignment |
| CRM-I7 | CTV never receives unscoped staff CRM access |

## 17. Primary Business Use Cases

| ID | Use case |
|----|----------|
| UC01 | Import Leads (Excel pipeline) |
| UC02 | Create / update Lead manually |
| UC03 | Assign Lead / change Customer Owner |
| UC04 | Qualify / disqualify Lead |
| UC05 | Convert Lead → Customer |
| UC06 | Add / update Contact |
| UC07 | Add Note / Timeline activity |
| UC08 | Search / filter Leads & Customers |
| UC09 | Follow Customer (Follower) |
| UC10 | Merge Duplicate (future) |

## 18. Ownership Matrix

| Business Object | Owner Domain | Referenced By |
|-----------------|--------------|---------------|
| Lead | CRM | Collaboration, Communication |
| Customer | CRM | Legal, Finance, Collaboration |
| Contact | CRM | Legal (context) |
| ImportBatch | CRM | — |
| Note / Activity (CRM) | CRM | Communication (optional) |

## 19. Domain Event Matrix

| Event | Producer | Consumers |
|-------|----------|-----------|
| `LeadCreated` | CRM | Communication |
| `LeadAssigned` | CRM | Communication |
| `LeadQualified` | CRM | Communication (optional) |
| `LeadConverted` | CRM | Legal, Communication, Dashboard |
| `LeadDisqualified` | CRM | Communication (optional) |
| `CustomerCreated` | CRM | Collaboration, Communication |
| `CustomerOwnerChanged` | CRM | Communication |
| `ImportCompleted` | CRM | Communication (optional) |

## 20. Business Constraints

| Constraint |
|------------|
| Converted Lead is not hard-deleted casually — retain terminal history |
| Customer linked to Official Contracts should be deactivated, not casually hard-deleted |
| Committed ImportBatch cannot be re-opened as the same preview batch |
| Owner change is an explicit business action |

## 21. Dynamic Features

| Feature | MVP stance |
|---------|------------|
| Lead sources | Fixed list; extend later by configuration |
| Excel import | Fixed template; extension point for dynamic mapping — **no metadata engine** |
| Analytics | Foundation metrics only (§22) |

## 22. Business Metrics

| Metric | Purpose |
|--------|---------|
| Lead conversion rate | Pipeline health |
| Source distribution | Channel mix |
| Follow-up / activity rate | Sales discipline |
| Open leads by owner | Workload |
| Import success vs duplicate rate | Data quality |

## 23. Cross Domain Dependency

| | Domains |
|--|---------|
| **Depends on** | Identity |
| **Provides to** | Legal (Customer), Finance (Customer), Collaboration, Communication |
| **Does not own** | Contract, Payment, Commission lifecycles |
