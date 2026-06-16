const Bookmark = require('../models/Bookmark');
const { validationResult } = require('express-validator');

// @desc    Get all bookmarks
// @route   GET /api/bookmarks
// @access  Private
exports.getBookmarks = async (req, res) => {
  try {
    const { category, priority, search, limit = 50, skip = 0 } = req.query;
    
    const query = {
      user_id: req.user.id,
      is_archived: false
    };

    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [search] } }
      ];
    }

    const bookmarks = await Bookmark.find(query)
      .sort({ created_at: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.json({
      success: true,
      bookmarks: bookmarks.map(b => ({
        id: b._id,
        title: b.title,
        url: b.url,
        category: b.category,
        priority: b.priority,
        description: b.description || '',
        tags: b.tags || [],
        created_at: b.created_at,
        updated_at: b.updated_at,
        clicks: b.clicks || 0
      })),
      total: bookmarks.length
    });
  } catch (error) {
    console.error('Get Bookmarks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bookmarks'
    });
  }
};

// @desc    Create bookmark
// @route   POST /api/bookmarks
// @access  Private
exports.createBookmark = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, url, category, priority, description, tags } = req.body;

    // Check for duplicate
    const existing = await Bookmark.findOne({
      user_id: req.user.id,
      url: url
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bookmark already exists'
      });
    }

    const bookmark = new Bookmark({
      user_id: req.user.id,
      title,
      url,
      category: category || 'personal',
      priority: priority || 'medium',
      description: description || '',
      tags: tags || []
    });

    await bookmark.save();

    res.status(201).json({
      success: true,
      message: 'Bookmark created successfully',
      bookmark_id: bookmark._id
    });
  } catch (error) {
    console.error('Create Bookmark Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating bookmark'
    });
  }
};

// @desc    Update bookmark
// @route   PUT /api/bookmarks/:id
// @access  Private
exports.updateBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, category, priority, description, tags } = req.body;

    const bookmark = await Bookmark.findOne({
      _id: id,
      user_id: req.user.id
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: 'Bookmark not found'
      });
    }

    // Update fields
    if (title) bookmark.title = title;
    if (url) bookmark.url = url;
    if (category) bookmark.category = category;
    if (priority) bookmark.priority = priority;
    if (description !== undefined) bookmark.description = description;
    if (tags) bookmark.tags = tags;

    await bookmark.save();

    res.json({
      success: true,
      message: 'Bookmark updated successfully'
    });
  } catch (error) {
    console.error('Update Bookmark Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating bookmark'
    });
  }
};

// @desc    Delete bookmark
// @route   DELETE /api/bookmarks/:id
// @access  Private
exports.deleteBookmark = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Bookmark.deleteOne({
      _id: id,
      user_id: req.user.id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bookmark not found'
      });
    }

    res.json({
      success: true,
      message: 'Bookmark deleted successfully'
    });
  } catch (error) {
    console.error('Delete Bookmark Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting bookmark'
    });
  }
};

// @desc    Increment bookmark click count
// @route   POST /api/bookmarks/:id/click
// @access  Private
exports.incrementClick = async (req, res) => {
  try {
    const { id } = req.params;

    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: 'Bookmark not found'
      });
    }

    res.json({
      success: true,
      message: 'Click recorded'
    });
  } catch (error) {
    console.error('Increment Click Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get bookmark statistics
// @route   GET /api/bookmarks/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const stats = await Bookmark.aggregate([
      {
        $match: {
          user_id: req.user.id,
          is_archived: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          categories: { $push: '$category' },
          priorities: { $push: '$priority' }
        }
      }
    ]);

    if (!stats || stats.length === 0) {
      return res.json({
        success: true,
        stats: {
          total: 0,
          work: 0,
          personal: 0,
          learning: 0,
          entertainment: 0,
          high_priority: 0,
          medium_priority: 0,
          low_priority: 0
        }
      });
    }

    const result = stats[0];
    const categories = result.categories || [];
    const priorities = result.priorities || [];

    res.json({
      success: true,
      stats: {
        total: result.total || 0,
        work: categories.filter(c => c === 'work').length,
        personal: categories.filter(c => c === 'personal').length,
        learning: categories.filter(c => c === 'learning').length,
        entertainment: categories.filter(c => c === 'entertainment').length,
        high_priority: priorities.filter(p => p === 'high').length,
        medium_priority: priorities.filter(p => p === 'medium').length,
        low_priority: priorities.filter(p => p === 'low').length
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats'
    });
  }
};

// @desc    Import multiple bookmarks
// @route   POST /api/bookmarks/import
// @access  Private
exports.importBookmarks = async (req, res) => {
  try {
    const bookmarks = req.body;
    
    if (!Array.isArray(bookmarks)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Expected array of bookmarks.'
      });
    }

    let importedCount = 0;

    for (const item of bookmarks) {
      if (!item.title || !item.url) continue;

      // Check for duplicate
      const existing = await Bookmark.findOne({
        user_id: req.user.id,
        url: item.url
      });

      if (!existing) {
        await Bookmark.create({
          user_id: req.user.id,
          title: item.title,
          url: item.url,
          category: item.category || 'personal',
          priority: item.priority || 'medium',
          description: item.description || '',
          tags: item.tags || []
        });
        importedCount++;
      }
    }

    res.json({
      success: true,
      message: `Imported ${importedCount} bookmarks`,
      imported_count: importedCount
    });
  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error importing bookmarks'
    });
  }
};