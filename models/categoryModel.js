const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category must have a name'],
        unique: true,
        trim: true,
    },
    slug: {
        type: String,
        unique: true,
    },
}, {
    timestamps: true,
});

// Create slug from name before saving
categorySchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;