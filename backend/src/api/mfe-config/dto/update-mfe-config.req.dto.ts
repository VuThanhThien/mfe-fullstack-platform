import { PartialType } from '@nestjs/swagger';
import { CreateMfeConfigReqDto } from './create-mfe-config.req.dto';

/**
 * `scopeNames` absent  -> scopes untouched.
 * `scopeNames: []`     -> 422 (ArrayNotEmpty survives PartialType).
 * `scopeNames: [...]`  -> full replacement of the granted set.
 */
export class UpdateMfeConfigReqDto extends PartialType(CreateMfeConfigReqDto) {}
