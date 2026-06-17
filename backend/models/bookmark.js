const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    validate: {
      validator: function (v) {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Please enter a valid URL'
    }
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'learning', 'entertainment'],
    default: 'personal'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  tags: {
    type: [String],
    default: []
  },
  clicks: {
    type: Number,
    default: 0
  },
  is_archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better query performance
bookmarkSchema.index({ user_id: 1, created_at: -1 });
bookmarkSchema.index({ category: 1 });
bookmarkSchema.index({ priority: 1 });
bookmarkSchema.index({ user_id: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);