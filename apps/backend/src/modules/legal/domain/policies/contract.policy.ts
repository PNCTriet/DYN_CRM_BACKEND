import { Injectable } from '@nestjs/common';
import {
  DataScope,
  ResourcePolicy,
} from '../../../../common/policies/resource-policy';

export interface ContractScopeRecord {
  id: string;
  customerOwnerId: string;
  createdByUserId: string | null;
}

/**
 * Contract scope via customer owner.
 * ALL if contract.delete (admin-like); else OWN when customer.ownerId = user.
 */
@Injectable()
export class ContractPolicy extends ResourcePolicy<ContractScopeRecord> {
  resolveScope(permissions: string[]): DataScope {
    if (permissions.includes('contract.delete')) return 'ALL';
    return 'OWN';
  }

  canView(
    userId: string,
    permissions: string[],
    record: ContractScopeRecord,
  ): boolean {
    return this.inScope(userId, permissions, record);
  }

  canUpdate(
    userId: string,
    permissions: string[],
    record: ContractScopeRecord,
  ): boolean {
    return this.inScope(userId, permissions, record);
  }

  listFilter(userId: string, permissions: string[]) {
    const scope = this.resolveScope(permissions);
    if (scope === 'OWN') return { scope, ownerId: userId };
    return { scope };
  }

  private inScope(
    userId: string,
    permissions: string[],
    record: ContractScopeRecord,
  ): boolean {
    const scope = this.resolveScope(permissions);
    if (scope === 'ALL') return true;
    return record.customerOwnerId === userId;
  }
}
