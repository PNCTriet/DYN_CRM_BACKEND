import { Injectable } from '@nestjs/common';
import {
  DataScope,
  ResourcePolicy,
} from '../../../../common/policies/resource-policy';

export interface ServiceRecord {
  id: string;
  createdByUserId: string | null;
}

/**
 * MVP scope: ALL if service.archive (admin-like), else OWN by createdByUserId.
 */
@Injectable()
export class ServicePolicy extends ResourcePolicy<ServiceRecord> {
  resolveScope(permissions: string[]): DataScope {
    if (permissions.includes('service.archive')) return 'ALL';
    return 'OWN';
  }

  canView(userId: string, permissions: string[], record: ServiceRecord): boolean {
    return this.inScope(userId, permissions, record);
  }

  canUpdate(userId: string, permissions: string[], record: ServiceRecord): boolean {
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
    record: ServiceRecord,
  ): boolean {
    const scope = this.resolveScope(permissions);
    if (scope === 'ALL') return true;
    return record.createdByUserId === userId;
  }
}
