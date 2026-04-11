const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  collectionName: {
    type: String,
    required: true
  },
  totalDocuments: {
    type: Number,
    required: true
  },
  inconsistenciesFound: {
    type: Number,
    required: true
  },
  repairsApplied: {
    type: Number,
    required: true
  },
  documentsDeleted: {
    type: Number,
    required: true
  },
  errors: [{
    type: String
  }],
  details: [{
    documentId: String,
    issue: String,
    action: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  duration: {
    type: Number, // in milliseconds
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
