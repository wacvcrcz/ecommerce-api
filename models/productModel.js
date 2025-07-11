const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A product must have a name'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'A product must have a description'],
    },
    price: {
        type: Number,
        required: [true, 'A product must have a price'],
        min: 0,
    },
    images: [{
        type: String,
        required: true,
    }],
    stock: {
        type: Number,
        required: [true, 'A product must have a stock quantity'],
        min: 0,
        default: 1,
    },
    category: {
        type: mongoose.Schema.ObjectId,
        ref: 'Category',
        required: [true, 'A product must belong to a category'],
    },
    tags: [String],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Populate category details when finding a product
productSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'category',
        select: 'name slug',
    });
    next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;