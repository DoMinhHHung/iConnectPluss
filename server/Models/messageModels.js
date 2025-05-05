const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReplySchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "Message",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const MessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
    },
    roomId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    reactions: {
      type: Object,
      default: {},
    },
    replyTo: {
      type: ReplySchema,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    fileThumbnail: {
      type: String,
      default: null,
    },
    fileId: {
      type: String,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    fileExpired: {
      type: Boolean,
      default: false,
    },
    chatType: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    isUnsent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

MessageSchema.set("toJSON", {
  transform: function (doc, ret) {
    if (!ret.reactions) {
      ret.reactions = {};
    }
    return ret;
  },
});

module.exports = mongoose.model("Message", MessageSchema);
