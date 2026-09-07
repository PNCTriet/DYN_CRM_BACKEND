Project dyn_crm {
  database_type: "PostgreSQL"
}


// ======================================================
// ENUMS
// ======================================================

Enum user_status {
  INVITED
  ACTIVE
  SUSPENDED
  DEACTIVATED
}

Enum customer_type {
  INDIVIDUAL
  COMPANY
}

Enum contract_status {
  DRAFT
  REVIEW
  WAITING_CUSTOMER
  SIGNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

Enum payment_method {
  CASH
  BANK_TRANSFER
  QR_PAYMENT
}

Enum payment_verification_status {
  RECORDED
  VERIFIED
  VOIDED
}

Enum invoice_status {
  DRAFT
  ISSUED
  CANCELLED
}

Enum expense_status {
  PENDING
  APPROVED
  REJECTED
}

Enum commission_status {
  PENDING
  CALCULATED
  APPROVED
  PAID
  CANCELLED
}

Enum collaborator_status {
  ACTIVE
  INACTIVE
}

Enum contract_request_status {
  DRAFT
  SUBMITTED
  IN_REVIEW
  NEEDS_INFO
  APPROVED
  REJECTED
}


// ======================================================
// 1. IDENTITY & ACCESS
// ======================================================

Table users {
  id uuid [pk]

  auth_subject_id text [unique, not null]

  email text
  display_name text [not null]
  phone text

  date_of_birth date
  address text
  avatar_url text

  status user_status [not null]

  deleted_at timestamptz

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    email
    phone
    status
  }
}


Table roles {
  id uuid [pk]

  code text [unique, not null]
  name text [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}


Table permissions {
  id uuid [pk]

  code text [unique, not null]
  description text

  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}


Table permission_groups {
  id uuid [pk]

  code text [unique, not null]
  name text [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}


Table user_roles {
  user_id uuid [not null]
  role_id uuid [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (user_id, role_id) [unique]
  }
}


Table role_permission_groups {
  role_id uuid [not null]
  permission_group_id uuid [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (role_id, permission_group_id) [unique]
  }
}


Table group_permissions {
  permission_group_id uuid [not null]
  permission_id uuid [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (permission_group_id, permission_id) [unique]
  }
}


// ======================================================
// 2. CRM
// ======================================================

Table leads {
  id uuid [pk]

  source text [not null]
  status text [not null]

  owner_id uuid
  converted_customer_id uuid [unique]

  name text
  phone text
  email text
  tax_id text

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    owner_id
    status
    phone
    email
    tax_id
  }
}


Table customers {
  id uuid [pk]

  type customer_type [not null]

  owner_id uuid [not null]

  industry_or_field text
  legal_name text [not null]
  display_name text [not null]

  phone text
  email text
  tax_id text

  deleted_at timestamptz

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    owner_id
    phone
    email
    tax_id
  }
}


Table contacts {
  id uuid [pk]

  customer_id uuid

  // Optional Lead relation because Contact may exist
  // before Lead conversion.
  lead_id uuid

  name text [not null]
  role_title text
  phone text
  email text

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    customer_id
    lead_id
    phone
    email
  }
}


Table customer_followers {
  customer_id uuid [not null]
  user_id uuid [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (customer_id, user_id) [unique]
  }
}


// Unified CRM / Legal timeline.

Table activities {
  id uuid [pk]

  subject_type text [not null]
  subject_id uuid [not null]

  type text [not null]
  payload json

  actor_user_id uuid [not null]
  occurred_at timestamptz [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (subject_type, subject_id)
    actor_user_id
    occurred_at
  }
}


Table notes {
  id uuid [pk]

  subject_type text [not null]
  subject_id uuid [not null]

  content text [not null]

  created_by_user_id uuid [not null]
  updated_by_user_id uuid [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (subject_type, subject_id)
    created_by_user_id
  }
}


Table import_batches {
  id uuid [pk]

  file_ref text
  status text [not null]

  created_by_user_id uuid [not null]
  committed_at timestamptz

  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}


Table import_rows {
  id uuid [pk]

  batch_id uuid [not null]

  row_number int [not null]
  raw_json json [not null]
  validation_status text [not null]

  resulting_lead_id uuid

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (batch_id, row_number) [unique]
    resulting_lead_id
  }
}


// ======================================================
// 3. SERVICE
// ======================================================

Table services {
  id uuid [pk]

  code text [unique]
  name text [not null]
  description text

  category text
  unit_price decimal(18,2)

  processing_days int

  status text [not null, default: 'ACTIVE']

  custom_fields json

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    code
    category
    status
  }
}


// ======================================================
// 4. COLLABORATION / CTV
// ======================================================

Table collaborators {
  id uuid [pk]

  user_id uuid [unique, not null]

  display_name text [not null]
  phone text
  email text

  status collaborator_status [not null, default: 'ACTIVE']

  notes text

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    user_id
    status
  }
}


Table collaborator_customers {
  collaborator_id uuid [not null]
  customer_id uuid [not null]

  assigned_at timestamptz [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (collaborator_id, customer_id) [unique]
    customer_id
  }
}


Table contract_requests {
  id uuid [pk]

  collaborator_id uuid [not null]

  customer_id uuid
  lead_id uuid

  title text [not null]
  description text

  status contract_request_status [not null, default: 'DRAFT']

  reviewed_by_user_id uuid
  reviewed_at timestamptz
  review_note text

  approved_contract_id uuid

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    collaborator_id
    customer_id
    lead_id
    status
    reviewed_by_user_id
  }
}


// ======================================================
// 5. LEGAL OPERATION
// ======================================================

Table contracts {
  id uuid [pk]

  contract_number text [not null]

  customer_id uuid [not null]

  status contract_status [not null]

  title text
  description text

  signed_at timestamptz

  deleted_at timestamptz

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    contract_number
    customer_id
    status
  }
}


Table workflow_templates {
  id uuid [pk]

  name text [not null]
  description text

  is_active boolean [not null, default: true]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid
}


Table workflow_stages {
  id uuid [pk]

  template_id uuid [not null]

  name text [not null]
  sort_order int [not null]

  responsible_role_code text

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (template_id, sort_order) [unique]
  }
}


Table stage_requirements {
  id uuid [pk]

  stage_id uuid [not null]

  type text [not null]
  config_json json

  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}


Table workflow_instances {
  id uuid [pk]

  contract_id uuid [not null]
  template_id uuid [not null]
  current_stage_id uuid [not null]

  started_at timestamptz [not null]
  completed_at timestamptz

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    contract_id
    template_id
    current_stage_id
  }
}


Table tasks {
  id uuid [pk]

  instance_id uuid
  contract_id uuid [not null]

  title text [not null]
  description text

  assignee_user_id uuid

  due_at timestamptz
  completed_at timestamptz

  status text [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    contract_id
    instance_id
    assignee_user_id
    status
    due_at
  }
}


Table document_metadata {
  id uuid [pk]

  contract_id uuid
  order_id uuid

  storage_key text [not null]
  file_name text [not null]

  file_type text
  mime_type text
  file_size bigint

  uploaded_by_user_id uuid [not null]

  deleted_at timestamptz

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    contract_id
    order_id
    uploaded_by_user_id
  }
}


// ======================================================
// 6. FINANCE — ORDER
// ======================================================

Table orders {
  id uuid [pk]

  order_number text [unique, not null]

  contract_id uuid [not null]
  customer_id uuid [not null]
  service_id uuid [not null]

  stage text [not null, default: 'new']

  channel text [not null, default: 'direct']

  collaborator_id uuid

  // Customer-facing / agreed value
  value decimal(18,2) [not null]

  // CTV price / commission-related amount
  collaborator_price decimal(18,2)

  total_net decimal(18,2) [not null]
  vat_rate decimal(5,2) [not null, default: 10]
  total_gross decimal(18,2) [not null]

  currency text [not null, default: 'VND']

  assigned_user_id uuid [not null]
  submitter_user_id uuid [not null]
  reviewer_user_id uuid

  deadline date
  vat_issue_deadline date

  needs_vat boolean [not null, default: false]

  // Number used by VAT workflow.
  // Must be unique when present.
  contract_number integer

  approval_status text [not null, default: 'none']

  pending_transition json
  approval_history json

  notes text

  zalo_group_link text

  service_start date
  service_end date

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    contract_id
    customer_id
    service_id
    stage
    channel
    collaborator_id
    assigned_user_id
    submitter_user_id
    reviewer_user_id
    deadline
    vat_issue_deadline
    contract_number
    service_end
  }
}


// ======================================================
// 7. FINANCE — PAYMENT SCHEDULE
// ======================================================

Table payment_schedules {
  id uuid [pk]

  order_id uuid [unique, not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid
}


Table payment_schedule_lines {
  id uuid [pk]

  schedule_id uuid [not null]

  due_date date
  amount decimal(18,2) [not null]

  sort_order int [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (schedule_id, sort_order) [unique]
    due_date
  }
}


// ======================================================
// 8. FINANCE — PAYMENT
// ======================================================

Table payments {
  id uuid [pk]

  order_id uuid [not null]
  schedule_line_id uuid

  amount decimal(18,2) [not null]

  method payment_method [not null]

  recorded_at timestamptz [not null]

  verification_status payment_verification_status [not null, default: 'RECORDED']

  provider text
  provider_payment_id text
  provider_status text

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    order_id
    schedule_line_id
    provider_payment_id
    verification_status
    recorded_at
  }
}


// ======================================================
// 9. FINANCE — VAT
// ======================================================

Table vat_invoices {
  id uuid [pk]

  invoice_number text [unique, not null]

  order_id uuid [not null]

  payment_id uuid

  source_type text [not null]

  customer_name text
  customer_tax_code text

  contract_number integer

  net_amount decimal(18,2) [not null]
  vat_rate decimal(5,2) [not null, default: 10]
  vat_amount decimal(18,2) [not null]
  gross_amount decimal(18,2) [not null]

  status invoice_status [not null, default: 'DRAFT']

  issue_date date
  due_date date

  lines json

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    invoice_number
    order_id
    payment_id
    status
    issue_date
    due_date
  }
}


// ======================================================
// 10. FINANCE — EXPENSE / CHI
// ======================================================

Table expenses {
  id uuid [pk]

  order_id uuid [not null]

  title text [not null]

  amount decimal(18,2) [not null]
  currency text [not null, default: 'VND']

  note text
  payee_name text
  description text

  incurred_on date

  ctv_related boolean [not null, default: false]

  status expense_status [not null, default: 'PENDING']

  requested_by_user_id uuid [not null]
  requested_at timestamptz [not null]

  reviewed_by_user_id uuid
  reviewed_at timestamptz
  review_note text

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    order_id
    status
    incurred_on
    requested_by_user_id
    reviewed_by_user_id
  }
}


// ======================================================
// 11. FINANCE — COMMISSION
// ======================================================

Table commissions {
  id uuid [pk]

  order_id uuid [not null]
  payment_id uuid

  collaborator_id uuid

  beneficiary_user_id uuid

  rate decimal(5,2) [not null]

  base_amount decimal(18,2) [not null]
  commission_amount decimal(18,2) [not null]

  period_start date [not null]
  period_end date [not null]

  status commission_status [not null]

  calculated_at timestamptz

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    order_id
    payment_id
    collaborator_id
    beneficiary_user_id
    period_start
    period_end
    status
  }
}


// ======================================================
// 12. COMMUNICATION
// ======================================================

Table notifications {
  id uuid [pk]

  recipient_user_id uuid [not null]

  type text [not null]

  title text [not null]
  body text

  read_at timestamptz

  source_type text
  source_id uuid

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    recipient_user_id
    read_at
    created_at
    (source_type, source_id)
  }
}


Table reminders {
  id uuid [pk]

  recipient_user_id uuid [not null]

  title text [not null]
  description text

  source_type text
  source_id uuid

  remind_at timestamptz [not null]

  status text [not null, default: 'PENDING']

  completed_at timestamptz

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  created_by_user_id uuid
  updated_by_user_id uuid

  indexes {
    recipient_user_id
    remind_at
    status
    (source_type, source_id)
  }
}


Table outbound_email_logs {
  id uuid [pk]

  to_address text [not null]

  template_key text [not null]

  provider_message_id text

  status text [not null]

  related_notification_id uuid

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    provider_message_id
    status
    related_notification_id
  }
}


// ======================================================
// 13. SYSTEM CONFIGURATION
// ======================================================

Table app_config {
  key text [pk]

  value_json json [not null]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}


// ======================================================
// REFERENCES — IDENTITY
// ======================================================

Ref: user_roles.user_id > users.id
Ref: user_roles.role_id > roles.id

Ref: role_permission_groups.role_id > roles.id
Ref: role_permission_groups.permission_group_id > permission_groups.id

Ref: group_permissions.permission_group_id > permission_groups.id
Ref: group_permissions.permission_id > permissions.id


// ======================================================
// REFERENCES — CRM
// ======================================================

Ref: leads.owner_id > users.id
Ref: leads.converted_customer_id > customers.id

Ref: customers.owner_id > users.id
Ref: customers.created_by_user_id > users.id
Ref: customers.updated_by_user_id > users.id

Ref: contacts.customer_id > customers.id
Ref: contacts.lead_id > leads.id

Ref: customer_followers.customer_id > customers.id
Ref: customer_followers.user_id > users.id

Ref: activities.actor_user_id > users.id

Ref: notes.created_by_user_id > users.id
Ref: notes.updated_by_user_id > users.id

Ref: import_batches.created_by_user_id > users.id

Ref: import_rows.batch_id > import_batches.id
Ref: import_rows.resulting_lead_id > leads.id


// ======================================================
// REFERENCES — SERVICE
// ======================================================

Ref: services.created_by_user_id > users.id
Ref: services.updated_by_user_id > users.id


// ======================================================
// REFERENCES — COLLABORATION
// ======================================================

Ref: collaborators.user_id > users.id
Ref: collaborators.created_by_user_id > users.id
Ref: collaborators.updated_by_user_id > users.id

Ref: collaborator_customers.collaborator_id > collaborators.id
Ref: collaborator_customers.customer_id > customers.id

Ref: contract_requests.collaborator_id > collaborators.id
Ref: contract_requests.customer_id > customers.id
Ref: contract_requests.lead_id > leads.id
Ref: contract_requests.reviewed_by_user_id > users.id
Ref: contract_requests.approved_contract_id > contracts.id
Ref: contract_requests.created_by_user_id > users.id
Ref: contract_requests.updated_by_user_id > users.id


// ======================================================
// REFERENCES — LEGAL
// ======================================================

Ref: contracts.customer_id > customers.id
Ref: contracts.created_by_user_id > users.id
Ref: contracts.updated_by_user_id > users.id

Ref: workflow_templates.created_by_user_id > users.id
Ref: workflow_templates.updated_by_user_id > users.id

Ref: workflow_stages.template_id > workflow_templates.id

Ref: stage_requirements.stage_id > workflow_stages.id

Ref: workflow_instances.contract_id > contracts.id
Ref: workflow_instances.template_id > workflow_templates.id
Ref: workflow_instances.current_stage_id > workflow_stages.id

Ref: tasks.instance_id > workflow_instances.id
Ref: tasks.contract_id > contracts.id
Ref: tasks.assignee_user_id > users.id
Ref: tasks.created_by_user_id > users.id
Ref: tasks.updated_by_user_id > users.id

Ref: document_metadata.contract_id > contracts.id
Ref: document_metadata.order_id > orders.id
Ref: document_metadata.uploaded_by_user_id > users.id


// ======================================================
// REFERENCES — FINANCE / ORDER
// ======================================================

Ref: orders.contract_id > contracts.id
Ref: orders.customer_id > customers.id
Ref: orders.service_id > services.id

Ref: orders.collaborator_id > collaborators.id

Ref: orders.assigned_user_id > users.id
Ref: orders.submitter_user_id > users.id
Ref: orders.reviewer_user_id > users.id

Ref: orders.created_by_user_id > users.id
Ref: orders.updated_by_user_id > users.id


// ======================================================
// REFERENCES — PAYMENT
// ======================================================

Ref: payment_schedules.order_id > orders.id

Ref: payment_schedules.created_by_user_id > users.id
Ref: payment_schedules.updated_by_user_id > users.id

Ref: payment_schedule_lines.schedule_id > payment_schedules.id

Ref: payments.order_id > orders.id
Ref: payments.schedule_line_id > payment_schedule_lines.id

Ref: payments.created_by_user_id > users.id
Ref: payments.updated_by_user_id > users.id


// ======================================================
// REFERENCES — VAT
// ======================================================

Ref: vat_invoices.order_id > orders.id
Ref: vat_invoices.payment_id > payments.id

Ref: vat_invoices.created_by_user_id > users.id
Ref: vat_invoices.updated_by_user_id > users.id


// ======================================================
// REFERENCES — EXPENSE
// ======================================================

Ref: expenses.order_id > orders.id

Ref: expenses.requested_by_user_id > users.id
Ref: expenses.reviewed_by_user_id > users.id

Ref: expenses.created_by_user_id > users.id
Ref: expenses.updated_by_user_id > users.id


// ======================================================
// REFERENCES — COMMISSION
// ======================================================

Ref: commissions.order_id > orders.id
Ref: commissions.payment_id > payments.id
Ref: commissions.collaborator_id > collaborators.id
Ref: commissions.beneficiary_user_id > users.id

Ref: commissions.created_by_user_id > users.id
Ref: commissions.updated_by_user_id > users.id


// ======================================================
// REFERENCES — COMMUNICATION
// ======================================================

Ref: notifications.recipient_user_id > users.id

Ref: reminders.recipient_user_id > users.id
Ref: reminders.created_by_user_id > users.id
Ref: reminders.updated_by_user_id > users.id

Ref: outbound_email_logs.related_notification_id > notifications.id