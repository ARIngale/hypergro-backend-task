import mongoose, { Document, Schema } from 'mongoose';

export interface IRecommendation extends Document {
  _id: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  message?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const recommendationSchema = new Schema<IRecommendation>({
  fromUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  toUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for better query performance
recommendationSchema.index({ toUserId: 1, isRead: 1, createdAt: -1 });
recommendationSchema.index({ fromUserId: 1, createdAt: -1 });

export const Recommendation = mongoose.model<IRecommendation>('Recommendation', recommendationSchema);