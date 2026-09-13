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
import { ListMfeConfigReqDto } from './dto/list-mfe-config.req.dto';
import { MfeConfigResDto } from './dto/mfe-config.res.dto';
import { UpdateMfeConfigReqDto } from './dto/update-mfe-config.req.dto';
import { MfeConfigService } from './mfe-config.service';

@ApiTags('mfe-configs')
@Controller({
  path: 'mfe-configs',
  version: '1',
})
export class MfeConfigController {
  constructor(private readonly mfeConfigService: MfeConfigService) {}

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
