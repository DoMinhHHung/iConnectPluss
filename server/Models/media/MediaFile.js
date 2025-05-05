const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MediaFileSchema = new Schema({
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: Object,
    default: {},
  },
  data: {
    type: Buffer,
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  expiresAt: {
    type: Date,
    default: function () {
      const now = new Date();
      return new Date(now.setDate(now.getDate() + 30));
    },
    index: { expires: 0 }, // Tự động xóa khi hết hạn
  },
  mediaType: {
    type: String,
    enum: ["image", "video", "audio", "file"],
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
});

// Index để tìm kiếm file nhanh hơn
MediaFileSchema.index({ filename: 1 });
MediaFileSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model("MediaFile", MediaFileSchema);
