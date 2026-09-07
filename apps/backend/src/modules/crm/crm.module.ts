import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CustomerApplicationService } from './application/customer.application-service';
import { LeadApplicationService } from './application/lead.application-service';
import { ContactApplicationService } from './application/contact.application-service';
import { CustomerPolicy } from './domain/policies/customer.policy';
import { LeadPolicy } from './domain/policies/lead.policy';
import { CustomerRepository } from './infrastructure/prisma/customer.repository';
import { LeadRepository } from './infrastructure/prisma/lead.repository';
import { ContactRepository } from './infrastructure/prisma/contact.repository';
import { CustomersController } from './presentation/customers.controller';
import { LeadsController } from './presentation/leads.controller';
import { ContactsController } from './presentation/contacts.controller';
import {
  CustomerFollowersController,
  CustomerFollowersService,
} from './presentation/customer-followers.controller';
import { NotesController, NotesService } from './presentation/notes.controller';
import {
  ActivitiesController,
  ActivitiesService,
} from './presentation/activities.controller';
import { ImportApplicationService } from './application/import.application-service';
import { ImportsController } from './presentation/imports.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    CustomersController,
    CustomerFollowersController,
    LeadsController,
    ContactsController,
    NotesController,
    ActivitiesController,
    ImportsController,
  ],
  providers: [
    CustomerApplicationService,
    LeadApplicationService,
    ContactApplicationService,
    ImportApplicationService,
    CustomerRepository,
    LeadRepository,
    ContactRepository,
    CustomerPolicy,
    LeadPolicy,
    CustomerFollowersService,
    NotesService,
    ActivitiesService,
  ],
  exports: [CustomerApplicationService, LeadApplicationService],
})
export class CrmModule {}
