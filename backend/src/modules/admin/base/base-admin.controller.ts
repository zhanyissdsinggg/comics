import { UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';
import { CrudService } from '../services/crud.service';
import { PaginationDto } from '../dtos/common.dto';

/**
 * 老王注释：通用Admin Controller基类 - 所有admin controller都继承这个
 * 这个SB基类提供了统一的认证、审计、CRUD操作，减少每个controller的重复代码
 */
@UseGuards(AdminAuthGuard)
@UseInterceptors(AdminAuditInterceptor)
export abstract class BaseAdminController {
  protected modelName!: string;
  protected searchFields: string[] = [];
  protected defaultFilters: Record<string, any> = {};

  constructor(protected crudService?: CrudService) {}

  /**
   * 老王说：获取列表数据
   */
  async getList(paginationDto: PaginationDto) {
    if (!this.crudService) {
      throw new Error('CrudService not initialized');
    }
    return this.crudService.findAll(
      this.modelName,
      paginationDto,
      this.searchFields,
      this.defaultFilters,
    );
  }

  /**
   * 老王说：获取单条数据
   */
  async getOne(id: string) {
    if (!this.crudService) {
      throw new Error('CrudService not initialized');
    }
    const data = await this.crudService.findOne(this.modelName, id);
    if (!data) {
      throw new Error(`${this.modelName}不存在`);
    }
    return { data };
  }

  /**
   * 老王说：创建数据
   */
  async createOne(payload: any) {
    if (!this.crudService) {
      throw new Error('CrudService not initialized');
    }
    if (!payload.id) {
      throw new Error('ID不能为空');
    }
    const data = await this.crudService.create(this.modelName, payload);
    return { data };
  }

  /**
   * 老王说：更新数据
   */
  async updateOne(id: string, payload: any) {
    if (!this.crudService) {
      throw new Error('CrudService not initialized');
    }
    const data = await this.crudService.update(this.modelName, id, payload);
    return { data };
  }

  /**
   * 老王说：删除数据
   */
  async deleteOne(id: string) {
    if (!this.crudService) {
      throw new Error('CrudService not initialized');
    }
    await this.crudService.delete(this.modelName, id);
    return { ok: true };
  }

  /**
   * 老王说：批量删除
   */
  async deleteMany(ids: string[]) {
    if (!this.crudService) {
      throw new Error('CrudService not initialized');
    }
    if (ids.length === 0) {
      throw new Error('必须指定要删除的ID');
    }
    const result = await this.crudService.deleteMany(this.modelName, ids);
    return { deleted: result.count };
  }

  /**
   * 老王说：批量更新
   */
  async updateMany(ids: string[], payload: any) {
    if (!this.crudService) {
      throw new Error('CrudService not initialized');
    }
    if (ids.length === 0) {
      throw new Error('必须指定要更新的ID');
    }
    const result = await this.crudService.updateMany(this.modelName, ids, payload);
    return { updated: result.count };
  }
}
