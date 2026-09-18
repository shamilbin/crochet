import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    images: {
      type: [String],
      validate: (arr) => arr.length > 0 && arr.length <= 4,
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    inStock: { type: Boolean, default: true },
    timeToMake: { type: String, default: '' }, // free text, e.g. "3-5 days"
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text' });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
