import { Injectable } from '@nestjs/common';
import {
  DataScope,
  ResourcePolicy,
} from '../../../../common/policies/resource-policy';

export interface TaskScopeRecord {
  id: string;
  assigneeUserId: string | null;
  createdByUserId: string | null;
}

/**
 * MVP: ALL if user has task.create + task.update (manage-like); else OWN by
 * assigneeUserId or createdByUserId.
 */
@Injectable()
export class TaskPolicy extends ResourcePolicy<TaskScopeRecord> {
  resolveScope(permissions: string[]): DataScope {
    if (
      permissions.includes('task.create') &&
      permissions.includes('task.update')
    ) {
      return 'ALL';
    }
    return 'OWN';
  }

  canView(userId: string, permissions: string[], record: TaskScopeRecord): boolean {
    return this.inScope(userId, permissions, record);
  }

  canUpdate(
    userId: string,
    permissions: string[],
    record: TaskScopeRecord,
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
    record: TaskScopeRecord,
  ): boolean {
    const scope = this.resolveScope(permissions);
    if (scope === 'ALL') return true;
    return (
      record.assigneeUserId === userId || record.createdByUserId === userId
    );
  }
}
