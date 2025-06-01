import mongoose, { Document, Schema } from 'mongoose';

export interface IProperty extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  amenities: string[];
  images: string[];
  isAvailable: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    index: true,
  },
  propertyType: {
    type: String,
    required: true,
    enum: ['apartment', 'house', 'condo', 'townhouse', 'villa', 'studio', 'other'],
    index: true,
  },
  bedrooms: {
    type: Number,
    required: true,
    min: 0,
    index: true,
  },
  bathrooms: {
    type: Number,
    required: true,
    min: 0,
    index: true,
  },
  area: {
    type: Number,
    required: true,
    min: 0,
    index: true,
  },
  location: {
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    zipCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  amenities: [{
    type: String,
    trim: true,
  }],
  images: [{
    type: String,
    trim: true,
  }],
  isAvailable: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for better query performance
propertySchema.index({ 'location.city': 1, propertyType: 1 });
propertySchema.index({ price: 1, bedrooms: 1, bathrooms: 1 });
propertySchema.index({ isAvailable: 1, createdAt: -1 });

export const Property = mongoose.model<IProperty>('Property', propertySchema);