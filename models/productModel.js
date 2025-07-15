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
    // --- CHANGED ---
    // The old 'stock' field is replaced by the 'inventory' array.
    inventory: [{
        _id: false, // Don't create an _id for each inventory entry
        size: {
            type: String,
            required: [true, 'Each inventory item must have a size.'],
            enum: {
                values: ['S', 'M', 'L', 'XL', 'XXL'],
                message: '{VALUE} is not a supported size. Supported sizes are S, M, L, XL, XXL.',
            },
        },
        quantity: {
            type: Number,
            required: [true, 'Each size must have a stock quantity.'],
            min: 0,
            default: 0,
        },
    }],
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


// --- ADDED ---
// Virtual property to calculate the total stock from the inventory array.
productSchema.virtual('totalStock').get(function() {
    return this.inventory ? this.inventory.reduce((total, item) => total + item.quantity, 0) : 0;
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