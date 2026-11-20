import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { NOTIFICATION_TIME_ZONE } from '../domain/civil-date';
import { NotificationScanService } from './notification-scan.service';

/** 07:00 Asia/Ho_Chi_Minh. Re-runs are safe because dedupe keys include the civil date. */
export const NOTIFICATION_SCAN_CRON = '0 7 * * *';

@Injectable()
export class NotificationScanCron {
  private readonly logger = new Logger(NotificationScanCron.name);

  constructor(
    private readonly scan: NotificationScanService,
    private readonly config: ConfigService,
  ) {}

  @Cron(NOTIFICATION_SCAN_CRON, {
    timeZone: NOTIFICATION_TIME_ZONE,
    waitForCompletion: true,
  })
  async handle(): Promise<void> {
    if (this.config.get<string>('NOTIFICATION_SCAN_ENABLED') === 'false') {
      this.logger.log('notification scan cron skipped (NOTIFICATION_SCAN_ENABLED=false)');
      return;
    }
    try {
      await this.scan.run(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`notification scan cron failed: ${message}`);
    }
  }
}
