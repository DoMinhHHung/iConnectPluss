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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", GroupSchema);
