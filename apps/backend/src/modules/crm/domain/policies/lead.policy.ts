import { Injectable } from '@nestjs/common';
import {
  DataScope,
  ResourcePolicy,
} from '../../../../common/policies/resource-policy';

export interface LeadRecord {
  id: string;
  ownerId: string | null;
}

/** Scope for leads — mirrors CustomerPolicy with lead.* permissions. */
@Injectable()
export class LeadPolicy extends ResourcePolicy<LeadRecord> {
  resolveScope(permissions: string[]): DataScope {
    const hasAssign = permissions.includes('lead.assign');
    const hasDelete = permissions.includes('lead.delete');
    const hasImport = permissions.includes('lead.import');
    if (hasAssign && hasDelete && hasImport) return 'ALL';
    if (hasAssign) return 'TEAM';
    return 'OWN';
  }

  canView(userId: string, permissions: string[], record: LeadRecord): boolean {
    return this.inScope(userId, permissions, record);
  }

  canUpdate(userId: string, permissions: string[], record: LeadRecord): boolean {
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
    record: LeadRecord,
  ): boolean {
    const scope = this.resolveScope(permissions);
    if (scope === 'ALL' || scope === 'TEAM') return true;
    return record.ownerId === userId;
  }
}
