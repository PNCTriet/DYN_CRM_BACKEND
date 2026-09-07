# Collaboration — DYN CRM

> Vietnamese: [Collaboration.vi.md](./Collaboration.vi.md)  
> DB: `collaborators`, `collaborator_customers`, `contract_requests` — see SchemaDesign.

## Scope note (2026-09-05)

The 2026-08-17 note that removed CTV operational models is **superseded** by the approved DB contract (`schema.sql`). CTV is back as a **restricted Collaboration** capability — not full CRM.

## 1. Purpose

Define how staff partner with **Collaborators (CTV)**: profile linked to Identity User, assigned customers, Contract Requests requiring staff approval, and commission visibility via Finance.

## 2. Scope

| In | Out |
|----|-----|
| Collaborator profile, assigned customers, Contract Request lifecycle | Full CRM/Legal/Finance for CTV |
| Staff review/approve/reject requests | CTV self-approve |
| Link to Commission (Finance) | BPMN |

## 3. Business Capability

| Capability | Status |
|------------|--------|
| CTV login (COLLABORATOR role) | Yes |
| Assigned customers (scoped) | Yes |
| Contract Request → staff approve → Official Contract | Yes |
| Own commission view | Yes (Finance) |
| Create Official Contract alone | **No** |

## 4. Objects

| Object | Table |
|--------|-------|
| Collaborator | collaborators (user_id unique) |
| Assigned customer | collaborator_customers |
| Contract Request | contract_requests |

**Request statuses:** DRAFT → SUBMITTED → IN_REVIEW → NEEDS_INFO | APPROVED | REJECTED.

## 5. Rules

1. CTV is not an employee; access is permission + ASSIGNED_CTV / OWN scope.  
2. Staff approval required before Official Contract from a request.  
3. CTV cannot approve own request.  
4. Commission remains based on **collected payment** (Finance).  
5. Do not grant unscoped staff CRM APIs to CTV.

## 6. Permissions (illustrative)

`collaborator.*`, `contract_request.create|view|review|approve|reject`, `collaborator_customer.assign`, `commission.view` (own).

## 7. Events

ContractRequestSubmitted / Reviewed / Approved / Rejected; OfficialContractCreatedFromRequest; CommissionVisibleToCtv.

## 8. Open Questions

- Referral attribution beyond collaborator_id on Order?  
- Who may approve besides Lawyer/Admin?  
- Required fields on Contract Request?
