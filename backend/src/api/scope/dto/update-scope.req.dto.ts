import { PartialType } from '@nestjs/swagger';
import { CreateScopeReqDto } from './create-scope.req.dto';

export class UpdateScopeReqDto extends PartialType(CreateScopeReqDto) {}
