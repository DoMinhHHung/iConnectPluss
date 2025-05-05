const mongoose = require("mongoose");

const AuthSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    verifyEmailToken: {
      type: String,
    },
    verifyEmailExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

AuthSchema.pre("save", function (next) {
  if (!this.userId && !this.email) {
    return next(new Error("Either userId or email is required"));
  }
  next();
});

module.exports = mongoose.model("Auth", AuthSchema);
