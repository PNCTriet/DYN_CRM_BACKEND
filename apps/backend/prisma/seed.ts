/**
 * DYN CRM — full development seed
 *
 * Idempotent strategy: wipe public business/identity tables then recreate.
 * Fixed UUIDs so Swagger Bearer tokens stay stable.
 *
 * Run: pnpm --filter @dyn-crm/backend prisma:seed
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/** Stable IDs for Swagger / curl */
const IDS = {
  admin: '11111111-1111-4111-8111-111111111101',
  manager: '11111111-1111-4111-8111-111111111102',
  sales: '11111111-1111-4111-8111-111111111103',
  salesOther: '11111111-1111-4111-8111-111111111104',
  lawyer: '11111111-1111-4111-8111-111111111105',
  accounting: '11111111-1111-4111-8111-111111111106',
  ctvUser: '11111111-1111-4111-8111-111111111107',
  suspended: '11111111-1111-4111-8111-111111111108',

  customerSales: '22222222-2222-4222-8222-222222222201',
  customerOther: '22222222-2222-4222-8222-222222222202',
  customerCtv: '22222222-2222-4222-8222-222222222203',
  leadOpen: '22222222-2222-4222-8222-222222222210',
  leadConverted: '22222222-2222-4222-8222-222222222211',

  serviceLegal: '33333333-3333-4333-8333-333333333301',
  collaborator: '33333333-3333-4333-8333-333333333310',

  contract: '44444444-4444-4444-8444-444444444401',
  template: '44444444-4444-4444-8444-444444444410',
  stage1: '44444444-4444-4444-8444-444444444411',
  stage2: '44444444-4444-4444-8444-444444444412',
  instance: '44444444-4444-4444-8444-444444444420',

  order: '55555555-5555-4555-8555-555555555501',
  schedule: '55555555-5555-4555-8555-555555555510',
  scheduleLine: '55555555-5555-4555-8555-555555555511',
  payment: '55555555-5555-4555-8555-555555555520',
  vatDraft: '55555555-5555-4555-8555-555555555530',
  expense: '55555555-5555-4555-8555-555555555540',
  commission: '55555555-5555-4555-8555-555555555550',
} as const;

const ALL_PERMISSIONS = [
  // CRM
  'customer.view',
  'customer.create',
  'customer.update',
  'customer.delete',
  'customer.assign',
  'customer.import',
  'customer.export',
  'lead.view',
  'lead.create',
  'lead.update',
  'lead.delete',
  'lead.assign',
  'lead.convert',
  'lead.import',
  'contact.view',
  'contact.create',
  'contact.update',
  'contact.delete',
  // Service
  'service.view',
  'service.create',
  'service.update',
  'service.archive',
  // Legal
  'contract.view',
  'contract.create',
  'contract.update',
  'contract.delete',
  'contract.change_status',
  'workflow_template.manage',
  'task.view',
  'task.create',
  'task.update',
  'document.upload',
  // Finance
  'order.view',
  'order.create',
  'order.update',
  'order.delete',
  'order.assign',
  'order.change_stage',
  'order.approve',
  'payment.view',
  'payment.create',
  'payment.verify',
  'payment.void',
  'vat.view',
  'vat.create',
  'vat.issue',
  'vat.cancel',
  'expense.view',
  'expense.create',
  'expense.approve',
  'commission.view',
  'commission.calculate',
  'commission.approve',
  'commission.pay',
  // Collaboration
  'collaborator.view',
  'collaborator.create',
  'collaborator.update',
  'collaborator.deactivate',
  'contract_request.create',
  'contract_request.view',
  'contract_request.review',
  'contract_request.approve',
  'contract_request.reject',
  'collaborator_customer.assign',
  // Identity / System
  'user.manage',
  'role.manage',
  'permission.manage',
  'notification.view_own',
  'config.manage',
] as const;

type GroupDef = { code: string; name: string; permissions: readonly string[] };

const GROUPS: GroupDef[] = [
  { code: 'identity.admin', name: 'Identity admin', permissions: ['user.manage', 'role.manage', 'permission.manage'] },
  { code: 'system.config', name: 'System config', permissions: ['config.manage', 'notification.view_own'] },
  {
    code: 'crm.full',
    name: 'CRM full',
    permissions: [
      'customer.view',
      'customer.create',
      'customer.update',
      'customer.delete',
      'customer.assign',
      'customer.import',
      'customer.export',
      'lead.view',
      'lead.create',
      'lead.update',
      'lead.delete',
      'lead.assign',
      'lead.convert',
      'lead.import',
      'contact.view',
      'contact.create',
      'contact.update',
      'contact.delete',
    ],
  },
  {
    code: 'crm.manage',
    name: 'CRM manage',
    permissions: [
      'customer.view',
      'customer.create',
      'customer.update',
      'customer.assign',
      'customer.export',
      'lead.view',
      'lead.create',
      'lead.update',
      'lead.assign',
      'lead.convert',
      'contact.view',
      'contact.create',
      'contact.update',
    ],
  },
  {
    code: 'crm.read',
    name: 'CRM read',
    permissions: ['customer.view', 'lead.view', 'contact.view'],
  },
  {
    code: 'lead.full',
    name: 'Lead full',
    permissions: [
      'lead.view',
      'lead.create',
      'lead.update',
      'lead.delete',
      'lead.assign',
      'lead.convert',
      'lead.import',
    ],
  },
  {
    code: 'service.full',
    name: 'Service full',
    permissions: ['service.view', 'service.create', 'service.update', 'service.archive'],
  },
  {
    code: 'legal.full',
    name: 'Legal full',
    permissions: [
      'contract.view',
      'contract.create',
      'contract.update',
      'contract.delete',
      'contract.change_status',
      'workflow_template.manage',
      'task.view',
      'task.create',
      'task.update',
      'document.upload',
    ],
  },
  {
    code: 'legal.read_write',
    name: 'Legal read/write',
    permissions: [
      'contract.view',
      'contract.create',
      'contract.update',
      'task.view',
      'task.create',
      'task.update',
      'document.upload',
    ],
  },
  {
    code: 'legal.support',
    name: 'Legal support',
    permissions: ['contract.view', 'task.view', 'task.update', 'document.upload'],
  },
  {
    code: 'finance.full',
    name: 'Finance full',
    permissions: [
      'order.view',
      'order.create',
      'order.update',
      'order.delete',
      'order.assign',
      'order.change_stage',
      'order.approve',
      'payment.view',
      'payment.create',
      'payment.verify',
      'payment.void',
      'vat.view',
      'vat.create',
      'vat.issue',
      'vat.cancel',
      'expense.view',
      'expense.create',
      'expense.approve',
      'commission.view',
      'commission.calculate',
      'commission.approve',
      'commission.pay',
    ],
  },
  {
    code: 'finance.read',
    name: 'Finance read',
    permissions: [
      'order.view',
      'payment.view',
      'vat.view',
      'expense.view',
      'commission.view',
    ],
  },
  {
    code: 'order.approve',
    name: 'Order approve',
    permissions: ['order.view', 'order.approve', 'order.change_stage'],
  },
  {
    code: 'order.create_own',
    name: 'Order create own',
    permissions: ['order.view', 'order.create', 'order.update', 'payment.view', 'payment.create'],
  },
  {
    code: 'collab.admin',
    name: 'Collaboration admin',
    permissions: [
      'collaborator.view',
      'collaborator.create',
      'collaborator.update',
      'collaborator.deactivate',
      'contract_request.view',
      'contract_request.review',
      'contract_request.approve',
      'contract_request.reject',
      'collaborator_customer.assign',
      'commission.view',
    ],
  },
  {
    code: 'collab.portal',
    name: 'CTV portal',
    permissions: [
      'customer.view',
      'contract_request.create',
      'contract_request.view',
      'commission.view',
      'notification.view_own',
    ],
  },
];

GROUPS.push({
  code: 'order.view',
  name: 'Order view only',
  permissions: ['order.view'],
});

const ROLE_GROUPS: Record<string, string[]> = {
  SUPER_ADMIN: GROUPS.map((g) => g.code),
  ADMIN: [
    'identity.admin',
    'crm.full',
    'service.full',
    'legal.full',
    'finance.full',
    'collab.admin',
    'system.config',
  ],
  MANAGER: ['crm.manage', 'legal.read_write', 'finance.read', 'order.approve', 'service.full'],
  LAWYER: ['legal.full', 'crm.read', 'order.view'],
  LEGAL_ASSISTANT: ['legal.support', 'crm.read'],
  ACCOUNTING: ['finance.full', 'crm.read'],
  SALES: ['crm.full', 'lead.full', 'order.create_own', 'service.full'],
  COLLABORATOR: ['collab.portal'],
};
async function wipe() {
  // Leaf → root
  await prisma.outboundEmailLog.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.vatInvoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentScheduleLine.deleteMany();
  await prisma.paymentSchedule.deleteMany();
  await prisma.documentMetadata.deleteMany();
  await prisma.task.deleteMany();
  await prisma.workflowInstance.deleteMany();
  await prisma.stageRequirement.deleteMany();
  await prisma.workflowStage.deleteMany();
  await prisma.workflowTemplate.deleteMany();
  await prisma.order.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.contractRequest.deleteMany();
  await prisma.collaboratorCustomer.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.service.deleteMany();
  await prisma.importRow.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.customerFollower.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.groupPermission.deleteMany();
  await prisma.rolePermissionGroup.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.permissionGroup.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appConfig.deleteMany();
}

async function seedIdentity() {
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.create({
      data: { code, description: code },
    });
  }

  const permissionByCode = Object.fromEntries(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );

  for (const g of GROUPS) {
    const group = await prisma.permissionGroup.create({
      data: { code: g.code, name: g.name },
    });
    for (const perm of g.permissions) {
      const permissionId = permissionByCode[perm];
      if (!permissionId) continue;
      await prisma.groupPermission.create({
        data: { permissionGroupId: group.id, permissionId },
      });
    }
  }

  const groupByCode = Object.fromEntries(
    (await prisma.permissionGroup.findMany()).map((g) => [g.code, g.id]),
  );

  const roleMeta: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    LAWYER: 'Lawyer',
    LEGAL_ASSISTANT: 'Legal Assistant',
    ACCOUNTING: 'Accounting',
    SALES: 'Sales',
    COLLABORATOR: 'Collaborator (CTV)',
  };

  for (const [code, name] of Object.entries(roleMeta)) {
    const role = await prisma.role.create({ data: { code, name } });
    for (const groupCode of ROLE_GROUPS[code] ?? []) {
      const permissionGroupId = groupByCode[groupCode];
      if (!permissionGroupId) continue;
      await prisma.rolePermissionGroup.create({
        data: { roleId: role.id, permissionGroupId },
      });
    }
  }

  const roleByCode = Object.fromEntries(
    (await prisma.role.findMany()).map((r) => [r.code, r.id]),
  );

  const users: Array<{
    id: string;
    email: string;
    displayName: string;
    status: 'ACTIVE' | 'SUSPENDED';
    role: string;
    authSubjectId: string;
  }> = [
    {
      id: IDS.admin,
      email: 'admin@dyn.local',
      displayName: 'Admin Seed',
      status: 'ACTIVE',
      role: 'ADMIN',
      authSubjectId: 'seed-admin',
    },
    {
      id: IDS.manager,
      email: 'manager@dyn.local',
      displayName: 'Manager Seed',
      status: 'ACTIVE',
      role: 'MANAGER',
      authSubjectId: 'seed-manager',
    },
    {
      id: IDS.sales,
      email: 'sales@dyn.local',
      displayName: 'Sales Seed',
      status: 'ACTIVE',
      role: 'SALES',
      authSubjectId: 'seed-sales',
    },
    {
      id: IDS.salesOther,
      email: 'sales2@dyn.local',
      displayName: 'Sales Other',
      status: 'ACTIVE',
      role: 'SALES',
      authSubjectId: 'seed-sales-other',
    },
    {
      id: IDS.lawyer,
      email: 'lawyer@dyn.local',
      displayName: 'Lawyer Seed',
      status: 'ACTIVE',
      role: 'LAWYER',
      authSubjectId: 'seed-lawyer',
    },
    {
      id: IDS.accounting,
      email: 'accounting@dyn.local',
      displayName: 'Accounting Seed',
      status: 'ACTIVE',
      role: 'ACCOUNTING',
      authSubjectId: 'seed-accounting',
    },
    {
      id: IDS.ctvUser,
      email: 'ctv@dyn.local',
      displayName: 'CTV Seed',
      status: 'ACTIVE',
      role: 'COLLABORATOR',
      authSubjectId: 'seed-ctv',
    },
    {
      id: IDS.suspended,
      email: 'suspended@dyn.local',
      displayName: 'Suspended Seed',
      status: 'SUSPENDED',
      role: 'SALES',
      authSubjectId: 'seed-suspended',
    },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        authSubjectId: u.authSubjectId,
        email: u.email,
        displayName: u.displayName,
        status: u.status,
      },
    });
    await prisma.userRole.create({
      data: { userId: u.id, roleId: roleByCode[u.role] },
    });
  }
}

async function seedDomainData() {
  await prisma.service.create({
    data: {
      id: IDS.serviceLegal,
      code: 'LEGAL_CONSULT',
      name: 'Tư vấn pháp lý doanh nghiệp',
      description: 'Gói tư vấn tháng',
      category: 'LEGAL',
      unitPrice: new Prisma.Decimal('5000000'),
      processingDays: 30,
      status: 'ACTIVE',
      createdByUserId: IDS.admin,
      updatedByUserId: IDS.admin,
    },
  });

  await prisma.customer.createMany({
    data: [
      {
        id: IDS.customerSales,
        type: 'COMPANY',
        ownerId: IDS.sales,
        industryOrField: 'Technology',
        legalName: 'Công ty TNHH Alpha Seed',
        displayName: 'Alpha Seed',
        phone: '0901000001',
        email: 'alpha@seed.local',
        taxId: '0100000001',
        createdByUserId: IDS.sales,
        updatedByUserId: IDS.sales,
      },
      {
        id: IDS.customerOther,
        type: 'INDIVIDUAL',
        ownerId: IDS.salesOther,
        industryOrField: null,
        legalName: 'Nguyễn Văn Beta',
        displayName: 'Beta',
        phone: '0901000002',
        email: 'beta@seed.local',
        taxId: null,
        createdByUserId: IDS.salesOther,
        updatedByUserId: IDS.salesOther,
      },
      {
        id: IDS.customerCtv,
        type: 'COMPANY',
        ownerId: IDS.sales,
        industryOrField: 'Retail',
        legalName: 'Công ty CTV Partner',
        displayName: 'CTV Partner Co',
        phone: '0901000003',
        email: 'ctv-partner@seed.local',
        taxId: '0100000003',
        createdByUserId: IDS.admin,
        updatedByUserId: IDS.admin,
      },
    ],
  });

  await prisma.customerFollower.create({
    data: { customerId: IDS.customerSales, userId: IDS.manager },
  });

  await prisma.lead.createMany({
    data: [
      {
        id: IDS.leadOpen,
        source: 'WEB',
        status: 'NEW',
        ownerId: IDS.sales,
        name: 'Lead Open Seed',
        phone: '0912000001',
        email: 'lead-open@seed.local',
      },
      {
        id: IDS.leadConverted,
        source: 'REFERRAL',
        status: 'CONVERTED',
        ownerId: IDS.sales,
        convertedCustomerId: IDS.customerSales,
        name: 'Lead Converted Seed',
        phone: '0912000002',
        email: 'lead-converted@seed.local',
        taxId: '0100000001',
      },
    ],
  });

  await prisma.contact.createMany({
    data: [
      {
        customerId: IDS.customerSales,
        name: 'Trần Liên Hệ',
        roleTitle: 'CEO',
        phone: '0903000001',
        email: 'ceo@alpha.seed',
      },
      {
        leadId: IDS.leadOpen,
        name: 'Contact Lead Open',
        roleTitle: 'Owner',
        phone: '0903000002',
        email: 'owner@lead.seed',
      },
    ],
  });

  await prisma.note.create({
    data: {
      subjectType: 'CUSTOMER',
      subjectId: IDS.customerSales,
      content: 'Ghi chú seed — khách quan tâm gói tư vấn.',
      createdByUserId: IDS.sales,
      updatedByUserId: IDS.sales,
    },
  });

  await prisma.activity.create({
    data: {
      subjectType: 'CUSTOMER',
      subjectId: IDS.customerSales,
      type: 'CALL',
      payload: { minutes: 15, outcome: 'FOLLOW_UP' },
      actorUserId: IDS.sales,
      occurredAt: new Date(),
    },
  });

  await prisma.collaborator.create({
    data: {
      id: IDS.collaborator,
      userId: IDS.ctvUser,
      displayName: 'CTV Seed Partner',
      phone: '0988000001',
      email: 'ctv@dyn.local',
      status: 'ACTIVE',
      createdByUserId: IDS.admin,
      updatedByUserId: IDS.admin,
    },
  });

  await prisma.collaboratorCustomer.create({
    data: {
      collaboratorId: IDS.collaborator,
      customerId: IDS.customerCtv,
      assignedAt: new Date(),
    },
  });

  await prisma.contractRequest.create({
    data: {
      collaboratorId: IDS.collaborator,
      customerId: IDS.customerCtv,
      title: 'Yêu cầu HĐ CTV seed',
      description: 'Xin duyệt soạn hợp đồng mẫu',
      status: 'SUBMITTED',
      createdByUserId: IDS.ctvUser,
      updatedByUserId: IDS.ctvUser,
    },
  });

  await prisma.contract.create({
    data: {
      id: IDS.contract,
      contractNumber: 'HD-SEED-001',
      customerId: IDS.customerSales,
      status: 'SIGNED',
      title: 'Hợp đồng tư vấn Alpha',
      signedAt: new Date(),
      createdByUserId: IDS.lawyer,
      updatedByUserId: IDS.lawyer,
    },
  });

  await prisma.workflowTemplate.create({
    data: {
      id: IDS.template,
      name: 'Legal Ops Standard',
      description: 'Template seed',
      isActive: true,
      createdByUserId: IDS.admin,
      updatedByUserId: IDS.admin,
      stages: {
        create: [
          {
            id: IDS.stage1,
            name: 'Intake',
            sortOrder: 1,
            responsibleRoleCode: 'LEGAL_ASSISTANT',
            requirements: {
              create: [{ type: 'DOCUMENT', configJson: { required: ['POA'] } }],
            },
          },
          {
            id: IDS.stage2,
            name: 'In Progress',
            sortOrder: 2,
            responsibleRoleCode: 'LAWYER',
          },
        ],
      },
    },
  });

  await prisma.workflowInstance.create({
    data: {
      id: IDS.instance,
      contractId: IDS.contract,
      templateId: IDS.template,
      currentStageId: IDS.stage1,
      startedAt: new Date(),
    },
  });

  await prisma.task.create({
    data: {
      contractId: IDS.contract,
      instanceId: IDS.instance,
      title: 'Thu thập giấy ủy quyền',
      status: 'OPEN',
      assigneeUserId: IDS.lawyer,
      createdByUserId: IDS.manager,
      updatedByUserId: IDS.manager,
    },
  });

  const net = new Prisma.Decimal('10000000');
  const vat = new Prisma.Decimal('1000000');
  const gross = new Prisma.Decimal('11000000');

  await prisma.order.create({
    data: {
      id: IDS.order,
      orderNumber: 'ORD-SEED-001',
      contractId: IDS.contract,
      customerId: IDS.customerSales,
      serviceId: IDS.serviceLegal,
      stage: 'in_progress',
      channel: 'ctv',
      collaboratorId: IDS.collaborator,
      value: net,
      collaboratorPrice: new Prisma.Decimal('2000000'),
      totalNet: net,
      vatRate: new Prisma.Decimal('10'),
      totalGross: gross,
      currency: 'VND',
      assignedUserId: IDS.lawyer,
      submitterUserId: IDS.sales,
      reviewerUserId: IDS.manager,
      needsVat: true,
      contractNumber: 1,
      approvalStatus: 'approved',
      notes: 'Order seed',
      createdByUserId: IDS.sales,
      updatedByUserId: IDS.sales,
    },
  });

  await prisma.paymentSchedule.create({
    data: {
      id: IDS.schedule,
      orderId: IDS.order,
      createdByUserId: IDS.accounting,
      updatedByUserId: IDS.accounting,
      lines: {
        create: [
          {
            id: IDS.scheduleLine,
            dueDate: new Date(),
            amount: gross,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      id: IDS.payment,
      orderId: IDS.order,
      scheduleLineId: IDS.scheduleLine,
      amount: new Prisma.Decimal('5000000'),
      method: 'BANK_TRANSFER',
      recordedAt: new Date(),
      verificationStatus: 'VERIFIED',
      createdByUserId: IDS.accounting,
      updatedByUserId: IDS.accounting,
    },
  });

  await prisma.vatInvoice.create({
    data: {
      id: IDS.vatDraft,
      invoiceNumber: 'VAT-SEED-DRAFT-001',
      orderId: IDS.order,
      paymentId: IDS.payment,
      sourceType: 'ORDER',
      customerName: 'Công ty TNHH Alpha Seed',
      customerTaxCode: '0100000001',
      contractNumber: 1,
      netAmount: new Prisma.Decimal('4545454.55'),
      vatRate: new Prisma.Decimal('10'),
      vatAmount: new Prisma.Decimal('454545.45'),
      grossAmount: new Prisma.Decimal('5000000'),
      status: 'DRAFT',
      lines: [{ description: 'Tư vấn', amount: 4545454.55 }],
      createdByUserId: IDS.accounting,
      updatedByUserId: IDS.accounting,
    },
  });

  await prisma.expense.create({
    data: {
      id: IDS.expense,
      orderId: IDS.order,
      title: 'Chi phí công chứng seed',
      amount: new Prisma.Decimal('500000'),
      currency: 'VND',
      note: 'Chờ duyệt',
      incurredOn: new Date(),
      ctvRelated: false,
      status: 'PENDING',
      requestedByUserId: IDS.sales,
      requestedAt: new Date(),
      createdByUserId: IDS.sales,
      updatedByUserId: IDS.sales,
    },
  });

  await prisma.commission.create({
    data: {
      id: IDS.commission,
      orderId: IDS.order,
      paymentId: IDS.payment,
      collaboratorId: IDS.collaborator,
      beneficiaryUserId: IDS.ctvUser,
      rate: new Prisma.Decimal('10'),
      baseAmount: new Prisma.Decimal('5000000'),
      commissionAmount: new Prisma.Decimal('500000'),
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-09-30'),
      status: 'CALCULATED',
      calculatedAt: new Date(),
      createdByUserId: IDS.accounting,
      updatedByUserId: IDS.accounting,
    },
  });

  await prisma.documentMetadata.create({
    data: {
      contractId: IDS.contract,
      orderId: IDS.order,
      storageKey: 'seed/contracts/hd-seed-001.pdf',
      fileName: 'hd-seed-001.pdf',
      fileType: 'contract',
      mimeType: 'application/pdf',
      fileSize: BigInt(1024),
      uploadedByUserId: IDS.lawyer,
    },
  });

  const notif = await prisma.notification.create({
    data: {
      recipientUserId: IDS.sales,
      type: 'ORDER_UPDATE',
      title: 'Order seed đã tạo',
      body: 'ORD-SEED-001',
      sourceType: 'ORDER',
      sourceId: IDS.order,
    },
  });

  await prisma.reminder.create({
    data: {
      recipientUserId: IDS.sales,
      title: 'Follow-up Alpha Seed',
      remindAt: new Date(Date.now() + 86400000),
      status: 'PENDING',
      sourceType: 'CUSTOMER',
      sourceId: IDS.customerSales,
      createdByUserId: IDS.sales,
      updatedByUserId: IDS.sales,
    },
  });

  await prisma.outboundEmailLog.create({
    data: {
      toAddress: 'sales@dyn.local',
      templateKey: 'order.created',
      status: 'SENT',
      providerMessageId: 'seed-msg-001',
      relatedNotificationId: notif.id,
    },
  });

  await prisma.appConfig.createMany({
    data: [
      {
        key: 'default_currency',
        valueJson: 'VND',
      },
      {
        key: 'default_vat_rate',
        valueJson: 10,
      },
      {
        key: 'feature_flags',
        valueJson: { sepay: false, ctv_portal: true },
      },
    ],
  });
}

async function main() {
  console.log('🌱 Seeding DYN CRM (wipe + recreate)...');
  await wipe();
  await seedIdentity();
  await seedDomainData();
  console.log('\n✅ Seed complete.\n');
  console.log('Swagger → Authorize với Bearer (không cần chữ Bearer trong một số UI, paste token):');
  console.log('────────────────────────────────────────────────────────');
  console.log(`Admin (ALL CRM)     test:${IDS.admin}`);
  console.log(`Manager (TEAM)      test:${IDS.manager}`);
  console.log(`Sales (OWN)         test:${IDS.sales}`);
  console.log(`Sales Other (OWN)   test:${IDS.salesOther}`);
  console.log(`Lawyer              test:${IDS.lawyer}`);
  console.log(`Accounting          test:${IDS.accounting}`);
  console.log(`CTV                 test:${IDS.ctvUser}`);
  console.log(`Suspended (401)     test:${IDS.suspended}`);
  console.log('────────────────────────────────────────────────────────');
  console.log(`Sample customer (owned by Sales): ${IDS.customerSales}`);
  console.log(`Other sales customer (scope deny for Sales): ${IDS.customerOther}`);
  console.log('GET /api/v1/customers  với Sales token để test.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
