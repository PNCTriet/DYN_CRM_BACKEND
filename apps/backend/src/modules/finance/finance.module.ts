import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrderApplicationService } from './application/order.application-service';
import { PaymentApplicationService } from './application/payment.application-service';
import { VatInvoiceApplicationService } from './application/vat-invoice.application-service';
import { ExpenseApplicationService } from './application/expense.application-service';
import { CommissionApplicationService } from './application/commission.application-service';
import { OrderPolicy } from './domain/policies/order.policy';
import { OrderRepository } from './infrastructure/prisma/order.repository';
import { PaymentRepository } from './infrastructure/prisma/payment.repository';
import { VatInvoiceRepository } from './infrastructure/prisma/vat-invoice.repository';
import { ExpenseRepository } from './infrastructure/prisma/expense.repository';
import { CommissionRepository } from './infrastructure/prisma/commission.repository';
import { OrdersController } from './presentation/orders.controller';
import { PaymentsController } from './presentation/payments.controller';
import { VatInvoicesController } from './presentation/vat-invoices.controller';
import { ExpensesController } from './presentation/expenses.controller';
import { CommissionsController } from './presentation/commissions.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    OrdersController,
    PaymentsController,
    VatInvoicesController,
    ExpensesController,
    CommissionsController,
  ],
  providers: [
    OrderApplicationService,
    PaymentApplicationService,
    VatInvoiceApplicationService,
    ExpenseApplicationService,
    CommissionApplicationService,
    OrderRepository,
    PaymentRepository,
    VatInvoiceRepository,
    ExpenseRepository,
    CommissionRepository,
    OrderPolicy,
  ],
  exports: [
    OrderApplicationService,
    PaymentApplicationService,
    VatInvoiceApplicationService,
    ExpenseApplicationService,
    CommissionApplicationService,
  ],
})
export class FinanceModule {}
