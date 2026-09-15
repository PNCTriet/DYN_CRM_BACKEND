import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WidgetoApplicationService } from '../application/widgeto.application-service';
import { WidgetoRangeQueryDto } from '../application/dto/widgeto.dto';
import { WidgetoKeyGuard } from './widgeto-key.guard';

@ApiTags('widgeto')
@ApiHeader({
  name: 'X-Widgeto-Key',
  description:
    'Shared secret (env WIDGETO_API_KEY). Alternative: query ?key= for Widgeto URL/QR.',
  required: false,
})
@Controller('widgeto')
@UseGuards(WidgetoKeyGuard)
export class WidgetoController {
  constructor(private readonly widgeto: WidgetoApplicationService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Dashboard KPI summary (customers + orders + payments)',
    description: 'Pass format=w12 for Widgeto W12 key-value rows.',
  })
  summary(@Query() query: WidgetoRangeQueryDto) {
    return this.widgeto.summary(query);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customer counts by status' })
  customers(@Query() query: WidgetoRangeQueryDto) {
    return this.widgeto.customers(query);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Order counts by stage' })
  orders(@Query() query: WidgetoRangeQueryDto) {
    return this.widgeto.orders(query);
  }

  @Get('payments')
  @ApiOperation({
    summary: 'Payment counts by verification status + VERIFIED amount',
  })
  payments(@Query() query: WidgetoRangeQueryDto) {
    return this.widgeto.payments(query);
  }
}
