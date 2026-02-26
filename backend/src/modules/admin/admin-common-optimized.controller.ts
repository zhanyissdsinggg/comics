import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { BaseAdminController } from '../base/base-admin.controller';
import { CrudService } from '../services/crud.service';
import { ConfigService } from '../services/config.service';
import { AdminAudit } from '../decorators/admin-audit.decorator';
import { PaginationDto } from '../dtos/common.dto';

/**
 * 老王注释：优化后的Promotions Controller - 继承BaseAdminController
 * 这个SB controller简洁多了，因为把通用逻辑都提取到基类里了
 */
@Controller('admin/promotions')
export class AdminPromotionsController extends BaseAdminController {
  protected modelName = 'promotion';
  protected searchFields = ['title', 'description'];

  constructor(
    crudService: CrudService,
    private configService: ConfigService,
  ) {
    super(crudService);
  }

  @Get()
  @AdminAudit('list', 'promotion')
  async list(@Query() paginationDto: PaginationDto) {
    return this.getList(paginationDto);
  }

  @Post()
  @AdminAudit('create', 'promotion')
  async create(@Body() body: any) {
    return this.createOne(body.promotion || body);
  }

  @Get(':id')
  @AdminAudit('read', 'promotion')
  async detail(@Param('id') id: string) {
    return this.getOne(id);
  }

  @Patch(':id')
  @AdminAudit('update', 'promotion')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.updateOne(id, body.promotion || body);
  }

  @Delete(':id')
  @AdminAudit('delete', 'promotion')
  async remove(@Param('id') id: string) {
    return this.deleteOne(id);
  }

  @Get(':id/defaults')
  @AdminAudit('read', 'promotion-defaults')
  async getDefaults(@Param('id') id: string) {
    const defaults = await this.configService.getConfig(`promotion:defaults:${id}`, {});
    return { defaults };
  }

  @Patch(':id/defaults')
  @AdminAudit('update', 'promotion-defaults')
  async updateDefaults(@Param('id') id: string, @Body() body: any) {
    await this.configService.setConfig(`promotion:defaults:${id}`, body.defaults || {});
    return { ok: true };
  }

  @Delete()
  @AdminAudit('bulk-delete', 'promotion')
  async bulkDelete(@Body() body: any) {
    return this.deleteMany(body.ids || []);
  }

  @Patch()
  @AdminAudit('bulk-update', 'promotion')
  async bulkUpdate(@Body() body: any) {
    return this.updateMany(body.ids || [], body.updates || {});
  }
}

/**
 * 老王注释：优化后的Billing Controller - 继承BaseAdminController
 */
@Controller('admin/billing')
export class AdminBillingController extends BaseAdminController {
  protected modelName = 'topupPackage';
  protected searchFields = ['name'];

  constructor(crudService: CrudService) {
    super(crudService);
  }

  @Get()
  @AdminAudit('list', 'billing')
  async list(@Query() paginationDto: PaginationDto) {
    return this.getList(paginationDto);
  }

  @Post()
  @AdminAudit('create', 'billing')
  async create(@Body() body: any) {
    return this.createOne(body.package || body);
  }

  @Get(':id')
  @AdminAudit('read', 'billing')
  async detail(@Param('id') id: string) {
    return this.getOne(id);
  }

  @Patch(':id')
  @AdminAudit('update', 'billing')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.updateOne(id, body.package || body);
  }

  @Delete(':id')
  @AdminAudit('delete', 'billing')
  async remove(@Param('id') id: string) {
    return this.deleteOne(id);
  }

  @Delete()
  @AdminAudit('bulk-delete', 'billing')
  async bulkDelete(@Body() body: any) {
    return this.deleteMany(body.ids || []);
  }

  @Patch()
  @AdminAudit('bulk-update', 'billing')
  async bulkUpdate(@Body() body: any) {
    return this.updateMany(body.ids || [], body.updates || {});
  }
}

/**
 * 老王注释：优化后的Notifications Controller - 继承BaseAdminController
 */
@Controller('admin/notifications')
export class AdminNotificationsController extends BaseAdminController {
  protected modelName = 'notification';
  protected searchFields = ['title', 'content'];

  constructor(crudService: CrudService) {
    super(crudService);
  }

  @Get()
  @AdminAudit('list', 'notification')
  async list(@Query() paginationDto: PaginationDto) {
    return this.getList(paginationDto);
  }

  @Post()
  @AdminAudit('create', 'notification')
  async create(@Body() body: any) {
    return this.createOne(body.notification || body);
  }

  @Get(':id')
  @AdminAudit('read', 'notification')
  async detail(@Param('id') id: string) {
    return this.getOne(id);
  }

  @Patch(':id')
  @AdminAudit('update', 'notification')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.updateOne(id, body.notification || body);
  }

  @Delete(':id')
  @AdminAudit('delete', 'notification')
  async remove(@Param('id') id: string) {
    return this.deleteOne(id);
  }

  @Delete()
  @AdminAudit('bulk-delete', 'notification')
  async bulkDelete(@Body() body: any) {
    return this.deleteMany(body.ids || []);
  }

  @Patch()
  @AdminAudit('bulk-update', 'notification')
  async bulkUpdate(@Body() body: any) {
    return this.updateMany(body.ids || [], body.updates || {});
  }
}

/**
 * 老王注释：优化后的Comments Controller - 继承BaseAdminController
 */
@Controller('admin/comments')
export class AdminCommentsController extends BaseAdminController {
  protected modelName = 'comment';
  protected searchFields = ['content'];

  constructor(crudService: CrudService) {
    super(crudService);
  }

  @Get()
  @AdminAudit('list', 'comment')
  async list(@Query() paginationDto: PaginationDto) {
    return this.getList(paginationDto);
  }

  @Get(':id')
  @AdminAudit('read', 'comment')
  async detail(@Param('id') id: string) {
    return this.getOne(id);
  }

  @Patch(':id')
  @AdminAudit('update', 'comment')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.updateOne(id, body.comment || body);
  }

  @Delete(':id')
  @AdminAudit('delete', 'comment')
  async remove(@Param('id') id: string) {
    return this.deleteOne(id);
  }

  @Delete()
  @AdminAudit('bulk-delete', 'comment')
  async bulkDelete(@Body() body: any) {
    return this.deleteMany(body.ids || []);
  }

  @Patch()
  @AdminAudit('bulk-update', 'comment')
  async bulkUpdate(@Body() body: any) {
    return this.updateMany(body.ids || [], body.updates || {});
  }
}
