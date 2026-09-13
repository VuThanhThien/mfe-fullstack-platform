import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ADMIN_SCOPE } from '@/constants/app.constant';
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
import { CreateScopeReqDto } from './dto/create-scope.req.dto';
import { ListScopeReqDto } from './dto/list-scope.req.dto';
import { ScopeResDto } from './dto/scope.res.dto';
import { UpdateScopeReqDto } from './dto/update-scope.req.dto';
import { ScopeService } from './scope.service';

@ApiTags('scopes')
@Controller({
  path: 'scopes',
  version: '1',
})
export class ScopeController {
  constructor(private readonly scopeService: ScopeService) {}

  @Get()
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: ScopeResDto,
    summary: 'List scopes',
    isPaginated: true,
  })
  async findAll(
    @Query() reqDto: ListScopeReqDto,
  ): Promise<OffsetPaginatedDto<ScopeResDto>> {
    return await this.scopeService.findAll(reqDto);
  }

  @Post()
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: ScopeResDto,
    summary: 'Create scope',
    statusCode: HttpStatus.CREATED,
    errorResponses: [400, 401, 403, 409, 422, 500],
  })
  async create(@Body() reqDto: CreateScopeReqDto): Promise<ScopeResDto> {
    return await this.scopeService.create(reqDto);
  }

  @Get(':id')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({ type: ScopeResDto, summary: 'Get scope by id' })
  @ApiParam({ name: 'id', type: 'String' })
  async findOne(@Param('id', ParseUUIDPipe) id: Uuid): Promise<ScopeResDto> {
    return await this.scopeService.findOne(id);
  }

  @Patch(':id')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    type: ScopeResDto,
    summary: 'Update scope',
    errorResponses: [400, 401, 403, 404, 409, 422, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  async update(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Body() reqDto: UpdateScopeReqDto,
  ): Promise<ScopeResDto> {
    return await this.scopeService.update(id, reqDto);
  }

  @Delete(':id')
  @RequireScopes(ADMIN_SCOPE)
  @ApiAuth({
    summary: 'Delete scope',
    errorResponses: [400, 401, 403, 404, 409, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  async remove(@Param('id', ParseUUIDPipe) id: Uuid): Promise<void> {
    return await this.scopeService.remove(id);
  }
}
