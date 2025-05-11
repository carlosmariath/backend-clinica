import { PartialType } from '@nestjs/swagger';
import { CreateFinanceCategoryDto } from './create-category.dto';

export class UpdateFinanceCategoryDto extends PartialType(CreateFinanceCategoryDto) {} 