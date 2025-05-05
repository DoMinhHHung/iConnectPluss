const mongoose = require("mongoose");
const { Schema } = mongoose;

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coAdmins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    avatarUrl: {
      type: String,
    },
    description: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // New fields for context menu options
    menuOptions: {
      deleteGroup: {
        enabled: {
          type: Boolean,
          default: true
        },
        adminOnly: {
          type: Boolean,
          default: true
        }
      },
      searchMessages: {
        enabled: {
          type: Boolean,
          default: true
        }
      },
      mediaGallery: {
        enabled: {
          type: Boolean,
          default: true
        },
        categories: {
          images: {
            type: Boolean,
            default: true
          },
          videos: {
            type: Boolean,
            default: true
          },
          audio: {
            type: Boolean,
            default: true
          },
          documents: {
            type: Boolean,
            default: true
          }
        }
      }
    },
    // Track media files shared in the group
    mediaFiles: [
      {
        fileId: String,
        fileType: {
          type: String,
          enum: ['image', 'video', 'audio', 'document']
        },
        fileUrl: String,
        fileName: String,
        fileThumbnail: String,
        sharedBy: {
          type: Schema.Types.ObjectId,
          ref: "User"
        },
        sharedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", GroupSchema);
