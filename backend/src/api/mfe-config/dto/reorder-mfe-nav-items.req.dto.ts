import {
  ClassField,
  NumberField,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ArrayNotEmpty } from 'class-validator';

export class ReorderMfeNavItemEntryDto {
  @UUIDField()
  id: string;

  @UUIDFieldOptional({
    nullable: true,
    description: 'New parent id. Null moves the node to the root.',
  })
  parentId?: string | null;

  @NumberField({ int: true, min: 0 })
  sortOrder: number;
}

export class ReorderMfeNavItemsReqDto {
  @ClassField(() => ReorderMfeNavItemEntryDto, {
    each: true,
    isArray: true,
    description: 'Batch of parent/sort updates applied in one transaction.',
  })
  @ArrayNotEmpty()
  items: ReorderMfeNavItemEntryDto[];
}
