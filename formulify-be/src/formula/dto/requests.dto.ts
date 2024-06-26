import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

// Formula Group DTOs
export class CreateFormulaGroupDto {
  @ApiProperty({
    description: 'Group name.',
  })
  @IsString()
  name: string;
}

export class UpdateFormulaGroupDto {
  @ApiProperty({
    description: 'Group name.',
  })
  @IsString()
  name: string;
}

// Formula DTOs
export class CreateFormulaDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({
    description:
      'String representation of the formula. Using mathematical operators, variables, or referencing other formulas by name.',
  })
  @IsString()
  representation: string;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'UUID of the formula group to which this formula belongs.',
  })
  @IsUUID()
  groupId: string;
}

export class UpdateFormulaDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({
    description:
      'String representation of the formula. Using mathematical operators, variables, or referencing other formulas by name.',
    example: 'x + y * 4',
  })
  @IsString()
  @IsOptional()
  representation: string;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'UUID of the formula group to which this formula belongs.',
  })
  @IsUUID()
  @IsOptional()
  groupId: string;
}

// Evaluation DTOs
export class EvaluateFormulaDto {
  @ApiProperty({
    description: 'Variables to be used in the evaluation of the formula.',
    format: 'object',
    example: { x: 1, y: 2, z: 3 },
  })
  @IsObject()
  variables: Record<string, number>;
}
