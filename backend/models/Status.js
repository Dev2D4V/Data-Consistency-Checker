const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  collection: {
    type: String,
    required: true,
    unique: true
  },
  isConsistent: {
    type: Boolean,
    required: true
  },
  lastCheckTime: {
    type: Date,
    required: true
  },
  lastConsistentTime: {
    type: Date
  },
  allReplicasConsistent: {
    type: Boolean,
    default: false
  },
  lastReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Status', statusSchema);
