import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ADMIN_SCOPE } from '@/constants/app.constant';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { RequireScopes } from '@/decorators/require-scopes.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateMfeConfigReqDto } from './dto/create-mfe-config.req.dto';
import { CreateMfeNavItemReqDto } from './dto/create-mfe-nav-item.req.dto';
import { ListMfeConfigReqDto } from './dto/list-mfe-config.req.dto';
import { MfeConfigResDto } from './dto/mfe-config.res.dto';
import { MfeNavItemResDto } from './dto/mfe-nav-item.res.dto';
import { MfeNavNodeResDto } from './dto/mfe-nav-node.res.dto';
import { ReorderMfeNavItemsReqDto } from './dto/reorder-mfe-nav-items.req.dto';
import { UpdateMfeConfigReqDto } from './dto/update-mfe-config.req.dto';
import { UpdateMfeNavItemReqDto } from './dto/update-mfe-nav-item.req.dto';
import { MfeConfigService } from './mfe-config.service';
import { MfeNavItemService } from './mfe-nav-item.service';

@ApiTags('mfe-configs')
@Controller({
  path: 'mfe-configs',
  version: '1',
})
export class MfeConfigController {
  constructor(
    private readonly mfeConfigService: MfeConfigService,
    private readonly mfeNavItemService: MfeNavItemService,
  ) {}

  /**
   * Declared before `@Get(':id')`, otherwise `accessible` is parsed as a UUID
   * param and ParseUUIDPipe answers 400.
   */
  @Get('accessible')
  @ApiAuth({
    type: MfeConfigResDto,
    summary: 'List MFE configs accessible to the current user',
    isArray: true,
  })
  async findAccessible(
    @CurrentUser('id') userId: Uuid,
  ): Promise<MfeConfigResDto[]> {
    return await this.mfeConfigService.findAccessible(userId);
  }

  /**
   * Static `by-route` prefix avoids clashing with UUID `:id`.
   */
  @Get('by-route/:routeName/nav/accessible')
  @ApiAuth({
    type: MfeNavNodeResDto,
    summary: 'List the scope-filtered nav tree for an accessible config',
    isArray: true,
    errorResponses: [400, 401, 404, 422, 500],
  })
  @ApiParam({ name: 'routeName', type: 'String' })
  async findNavAccessible(
    @CurrentUser('id') userId: Uuid,
    @Param('routeName') routeName: string,
  ): Promise<MfeNavNodeResDto[]> {
    return await this.mfeNavItemService.findNavAccessible(userId, routeName);
  }

  @Get()
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: MfeConfigResDto,
    summary: 'List all MFE configs',
    isPaginated: true,
  })
  async findAll(
    @Query() reqDto: ListMfeConfigReqDto,
  ): Promise<OffsetPaginatedDto<MfeConfigResDto>> {
    return await this.mfeConfigService.findAll(reqDto);
  }

  @Post()
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: MfeConfigResDto,
    summary: 'Create MFE config',
    statusCode: HttpStatus.CREATED,
    errorResponses: [400, 401, 403, 409, 422, 500],
  })
  async create(
    @Body() reqDto: CreateMfeConfigReqDto,
  ): Promise<MfeConfigResDto> {
    return await this.mfeConfigService.create(reqDto);
  }

  @Get(':id/nav-items')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: MfeNavItemResDto,
    summary: 'List the full nav tree for a config (admin)',
    isArray: true,
  })
  @ApiParam({ name: 'id', type: 'String' })
  async findNavItems(
    @Param('id', ParseUUIDPipe) id: Uuid,
  ): Promise<MfeNavItemResDto[]> {
    return await this.mfeNavItemService.findAllForAdmin(id);
  }

  @Post(':id/nav-items')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: MfeNavItemResDto,
    summary: 'Create a nav node',
    statusCode: HttpStatus.CREATED,
    errorResponses: [400, 401, 403, 404, 409, 422, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  async createNavItem(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Body() reqDto: CreateMfeNavItemReqDto,
  ): Promise<MfeNavItemResDto> {
    return await this.mfeNavItemService.create(id, reqDto);
  }

  /**
   * `reorder` must be declared before `:itemId` or ParseUUIDPipe treats
   * the literal as a UUID and answers 400.
   */
  @Patch(':id/nav-items/reorder')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: MfeNavItemResDto,
    summary: 'Reorder / reparent nav nodes in batch',
    isArray: true,
    errorResponses: [400, 401, 403, 404, 409, 422, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  async reorderNavItems(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Body() reqDto: ReorderMfeNavItemsReqDto,
  ): Promise<MfeNavItemResDto[]> {
    return await this.mfeNavItemService.reorder(id, reqDto);
  }

  @Patch(':id/nav-items/:itemId')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: MfeNavItemResDto,
    summary: 'Update a nav node',
    errorResponses: [400, 401, 403, 404, 409, 422, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  @ApiParam({ name: 'itemId', type: 'String' })
  async updateNavItem(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Param('itemId', ParseUUIDPipe) itemId: Uuid,
    @Body() reqDto: UpdateMfeNavItemReqDto,
  ): Promise<MfeNavItemResDto> {
    return await this.mfeNavItemService.update(id, itemId, reqDto);
  }

  @Delete(':id/nav-items/:itemId')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    summary: 'Delete a nav node (cascades children)',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  @ApiParam({ name: 'itemId', type: 'String' })
  async removeNavItem(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Param('itemId', ParseUUIDPipe) itemId: Uuid,
  ): Promise<void> {
    return await this.mfeNavItemService.remove(id, itemId);
  }

  @Get(':id')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({ type: MfeConfigResDto, summary: 'Get MFE config by id' })
  @ApiParam({ name: 'id', type: 'String' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: Uuid,
  ): Promise<MfeConfigResDto> {
    return await this.mfeConfigService.findOne(id);
  }

  @Patch(':id')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: MfeConfigResDto,
    summary: 'Update MFE config',
    errorResponses: [400, 401, 403, 404, 409, 422, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  async update(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Body() reqDto: UpdateMfeConfigReqDto,
  ): Promise<MfeConfigResDto> {
    return await this.mfeConfigService.update(id, reqDto);
  }

  @Delete(':id')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    summary: 'Delete MFE config',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  async remove(@Param('id', ParseUUIDPipe) id: Uuid): Promise<void> {
    return await this.mfeConfigService.remove(id);
  }
}
