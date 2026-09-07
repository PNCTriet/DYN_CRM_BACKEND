import { Injectable } from '@nestjs/common';
import {
  DataScope,
  ResourcePolicy,
} from '../../../../common/policies/resource-policy';

export interface CustomerRecord {
  id: string;
  ownerId: string;
}

/**
 * Capability is checked by RbacGuard.
 * This policy only evaluates data scope for customer records.
 *
 * MVP scope resolution (see Authorization.md):
 * - ALL: full CRM admin-like set (assign + delete + export)
 * - TEAM: has customer.assign (manager-like)
 * - OWN: default
 */
@Injectable()
export class CustomerPolicy extends ResourcePolicy<CustomerRecord> {
  resolveScope(permissions: string[]): DataScope {
    const hasAssign = permissions.includes('customer.assign');
    const hasDelete = permissions.includes('customer.delete');
    const hasExport = permissions.includes('customer.export');
    if (hasAssign && hasDelete && hasExport) {
      return 'ALL';
    }
    if (hasAssign) {
      return 'TEAM';
    }
    return 'OWN';
  }

  canView(userId: string, permissions: string[], record: CustomerRecord): boolean {
    return this.inScope(userId, permissions, record);
  }

  canUpdate(userId: string, permissions: string[], record: CustomerRecord): boolean {
    return this.inScope(userId, permissions, record);
  }

  listFilter(userId: string, permissions: string[]) {
    const scope = this.resolveScope(permissions);
    if (scope === 'OWN') {
      return { scope, ownerId: userId };
    }
    // TEAM: org mapping not locked — MVP treats TEAM as unfiltered (document OPEN in SchemaDesign/Authorization)
    return { scope };
  }

  private inScope(
    userId: string,
    permissions: string[],
    record: CustomerRecord,
  ): boolean {
    const scope = this.resolveScope(permissions);
    if (scope === 'ALL' || scope === 'TEAM') {
      return true;
    }
    return record.ownerId === userId;
  }
}
