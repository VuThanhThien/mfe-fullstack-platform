import { PartialType } from '@nestjs/swagger';
import { CreateMfeNavItemReqDto } from './create-mfe-nav-item.req.dto';

/**
 * `scopeNames` absent  -> scopes untouched.
 * `scopeNames: []`     -> 422 (ArrayNotEmpty survives PartialType).
 * `scopeNames: [...]`  -> full replacement of the granted set.
 *
 * Path-vs-type is re-checked in the service after merge (partial payloads
 * cannot express the create-time class validator).
 */
export class UpdateMfeNavItemReqDto extends PartialType(
  CreateMfeNavItemReqDto,
) {}
