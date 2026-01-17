import { IsNotEmpty, IsString, IsArray, IsOptional, IsEnum, ValidateNested, IsNumber, Min, IsEmail, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum FulfillmentType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  CURBSIDE = 'CURBSIDE',
}

export class DeliveryAddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsOptional()
  apartment?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}

export class DeliveryWindowDto {
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  date?: string;
}

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsOptional()
  productImage?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  attributes?: any;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(FulfillmentType)
  fulfillmentType: FulfillmentType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  @IsOptional()
  deliveryAddress?: DeliveryAddressDto;

  @ValidateNested()
  @Type(() => DeliveryWindowDto)
  @IsOptional()
  deliveryWindow?: DeliveryWindowDto;

  @IsString()
  @IsOptional()
  customerNotes?: string;

  @IsPhoneNumber()
  @IsOptional()
  contactPhone?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  optimizationStrategy?: string;

  @IsNumber()
  @IsOptional()
  estimatedSavings?: number;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional()
  paymentIntentId?: string;
}
