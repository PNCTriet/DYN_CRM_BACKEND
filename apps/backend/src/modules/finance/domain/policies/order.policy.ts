import { Injectable } from '@nestjs/common';
import {
  DataScope,
  ResourcePolicy,
} from '../../../../common/policies/resource-policy';

export interface OrderScopeRecord {
  id: string;
  assignedUserId: string;
  submitterUserId: string;
}

/**
 * Soft scope: OWN filters by assignedUserId when user lacks order.assign.
 * Has order.assign → ALL (no assigned filter).
 */
@Injectable()
export class OrderPolicy extends ResourcePolicy<OrderScopeRecord> {
  resolveScope(permissions: string[]): DataScope {
    if (permissions.includes('order.assign')) return 'ALL';
    return 'OWN';
  }

  canView(
    userId: string,
    permissions: string[],
    record: OrderScopeRecord,
  ): boolean {
    return this.inScope(userId, permissions, record);
  }

  canUpdate(
    userId: string,
    permissions: string[],
    record: OrderScopeRecord,
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
    record: OrderScopeRecord,
  ): boolean {
    const scope = this.resolveScope(permissions);
    if (scope === 'ALL') return true;
    return record.assignedUserId === userId;
  }
}
