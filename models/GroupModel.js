const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  }],
}, { timestamps: true });

// ✅ Fix: Prevent OverwriteModelError
const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

module.exports = Group;
