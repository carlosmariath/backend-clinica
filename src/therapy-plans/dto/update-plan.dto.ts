import { PartialType } from '@nestjs/swagger';
import { CreateTherapyPlanDto } from './create-plan.dto';

export class UpdateTherapyPlanDto extends PartialType(CreateTherapyPlanDto) {}
