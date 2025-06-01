import Joi from 'joi';

export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().optional(),
});

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const propertySchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  price: Joi.number().min(0).required(),
  propertyType: Joi.string().valid('apartment', 'house', 'condo', 'townhouse', 'villa', 'studio', 'other').required(),
  bedrooms: Joi.number().min(0).required(),
  bathrooms: Joi.number().min(0).required(),
  area: Joi.number().min(0).required(),
  location: Joi.object({
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180),
    }).optional(),
  }).required(),
  amenities: Joi.array().items(Joi.string()).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  isAvailable: Joi.boolean().optional(),
});

export const propertyUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  description: Joi.string().min(10).max(2000).optional(),
  price: Joi.number().min(0).optional(),
  propertyType: Joi.string().valid('apartment', 'house', 'condo', 'townhouse', 'villa', 'studio', 'other').optional(),
  bedrooms: Joi.number().min(0).optional(),
  bathrooms: Joi.number().min(0).optional(),
  area: Joi.number().min(0).optional(),
  location: Joi.object({
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180),
    }).optional(),
  }).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  isAvailable: Joi.boolean().optional(),
});

export const recommendationSchema = Joi.object({
  toUserEmail: Joi.string().email().required(),
  propertyId: Joi.string().required(),
  message: Joi.string().max(500).optional(),
});