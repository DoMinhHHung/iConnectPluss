const userModel = require("../Models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const AuthModel = require("../Models/authModel");

// Add OTP storage object
const otpStore = {};

const createToken = (_id) => {
  const jwtkey = process.env.JWT_SECRET;
  return jwt.sign({ _id }, jwtkey, { expiresIn: "3d" });
};

const sendOtpEmail = async (email, otp, type = "verification") => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let subject = "iTalk+ Your OTP Verification Code";
  let heading = "OTP Verification Code";
  let description = "Here is your OTP verification code:";

  if (type === "password_change") {
    subject = "iTalk+ Password Change Request";
    heading = "Password Change Request";
    description = "Here is your OTP to reset your password:";
  } else if (type === "password_reset") {
    subject = "iTalk+ Password Reset Request";
    heading = "Password Reset Request";
    description = "Here is your OTP to reset your password:";
  } else if (type === "email_change") {
    subject = "iTalk+ Email Change Request";
    heading = "Email Change Verification";
    description = "Here is your OTP to verify your new email address:";
  }

  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: subject,
    html: `
        <div style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #007bff; margin-top: 0;">${heading}</h2>
                <p style="font-size: 16px;">${description}</p>
                <div style="background-color: #e0f7fa; color: #00acc1; font-size: 24px; font-weight: bold; padding: 15px; border-radius: 5px; text-align: center;">
                    ${otp}
                </div>
                <p style="font-size: 16px; margin-top: 20px;">This code will expire in <strong>5 minutes</strong>.</p>
                <p style="font-size: 16px;">Please do not share this code with anyone.</p>
                <p style="font-size: 14px; color: #777; margin-top: 30px;">Sincerely,<br>${process.env.EMAIL_FROM_NAME}</p>
            </div>
        </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const registerUser = async (req, res) => {
  const { name, email, phone, password, gender, birthDate, address, otp } =
    req.body;

  try {
    // Kiểm tra OTP từ cơ sở dữ liệu thay vì từ otpStore
    // Nếu có email, kiểm tra OTP
    if (email) {
      const authRecord = await AuthModel.findOne({ email });
      if (
        !otp ||
        !authRecord ||
        authRecord.otp !== otp ||
        authRecord.otpExpiresAt < new Date()
      ) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Xóa OTP sau khi đã xác thực thành công
      await AuthModel.findOneAndUpdate(
        { email },
        { $unset: { otp: "", otpExpiresAt: "" } }
      );
    }

    // Kiểm tra xem có ít nhất email hoặc phone
    if (!email && !phone) {
      return res.status(400).json({
        message: "Either email or phone number is required",
      });
    }

    // Tạo điều kiện tìm kiếm dựa trên thông tin được cung cấp
    const searchConditions = [];
    if (email) searchConditions.push({ email });
    if (phone) searchConditions.push({ phone });

    let user = await userModel.findOne({
      $or: searchConditions,
    });

    if (user) {
      return res.status(400).json({
        message: "User with this email or phone number already exists",
      });
    }

    if (
      !name ||
      (!email && !phone) ||
      !password ||
      !gender ||
      !birthDate ||
      !address
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    // Validate email nếu được cung cấp
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate phone nếu được cung cấp
    if (
      phone &&
      !validator.isMobilePhone(phone, "any", { strictMode: false })
    ) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      name,
      email: email || "", // Lưu chuỗi rỗng nếu không có email
      phone: phone || "", // Lưu chuỗi rỗng nếu không có phone
      password: hashedPassword,
      gender,
      birthDate,
      address,
    });

    await newUser.save();
    const token = createToken(newUser._id);
    res.status(201).json({ _id: newUser._id, phone, email, name, token });
  } catch (error) {
    console.error("Error during registration:", error);
    res
      .status(500)
      .json({ message: "Error during registration", error: error.message });
  }
};

const requestOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Save OTP to AuthModel
    await AuthModel.findOneAndUpdate(
      { userId: user._id },
      { otp, otpExpiresAt },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, otp, "password_reset");
    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res
      .status(500)
      .json({ message: "Error sending OTP", error: error.message });
  }
};

const sendRegistrationOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Lưu OTP tạm thời (không cần user ID vì người dùng chưa được tạo)
    // Sử dụng email làm key
    await AuthModel.findOneAndUpdate(
      { email },
      { otp, otpExpiresAt },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, otp);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Error sending registration OTP:", error);
    res
      .status(500)
      .json({ message: "Error sending OTP", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const authRecord = await AuthModel.findOne({ userId: user._id });
    if (
      !authRecord ||
      authRecord.otp !== otp ||
      authRecord.otpExpiresAt < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    // Remove OTP after successful password reset
    await AuthModel.findOneAndUpdate(
      { userId: user._id },
      { $unset: { otp: "", otpExpiresAt: "" } }
    );

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res
      .status(500)
      .json({ message: "Error resetting password", error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { emailOrPhone, password } = req.body;

  try {
    console.log("==== DEBUG LOGIN ====");
    console.log(`Đang cố gắng đăng nhập với: ${emailOrPhone}`);
    console.log(
      `Password được cung cấp: ${
        password ? "Có mật khẩu" : "Không có mật khẩu"
      }`
    );
    console.log(`Kiểu dữ liệu của password: ${typeof password}`);

    if (!emailOrPhone || !password) {
      console.log("Thiếu email/số điện thoại hoặc mật khẩu");
      return res
        .status(400)
        .json({ message: "Vui lòng nhập email/số điện thoại và mật khẩu" });
    }

    // Tìm kiếm user với điều kiện lỏng hơn
    let user = await userModel.findOne({
      $or: [
        { email: emailOrPhone },
        { phone: emailOrPhone },
        { email: emailOrPhone.toString().trim() },
        { phone: emailOrPhone.toString().trim() },
      ],
    });

    if (!user) {
      console.log(`Không tìm thấy người dùng với: ${emailOrPhone}`);
      // Để debug: Liệt kê một vài người dùng để kiểm tra
      const sampleUsers = await userModel.find().limit(3).select("email phone");
      console.log(
        "Danh sách người dùng trong DB:",
        JSON.stringify(sampleUsers)
      );
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }

    console.log(
      `Tìm thấy người dùng: ${user.name}, email: ${user.email}, phone: ${user.phone}`
    );
    console.log(
      `Mật khẩu đã hash trong DB: ${user.password.substring(0, 10)}...`
    );

    // Đảm bảo mật khẩu là chuỗi hợp lệ
    let isPasswordValid = false;
    try {
      // Chuyển password về string để đảm bảo
      const passwordStr = String(password);
      console.log(`So sánh mật khẩu... (đã convert sang string)`);
      isPasswordValid = await bcrypt.compare(passwordStr, user.password);
      console.log(
        `Kết quả so sánh mật khẩu: ${isPasswordValid ? "KHỚP" : "KHÔNG KHỚP"}`
      );
    } catch (err) {
      console.error(`Lỗi khi so sánh mật khẩu: ${err.message}`);
      return res
        .status(500)
        .json({ message: "Lỗi xác thực mật khẩu", error: err.message });
    }

    if (!isPasswordValid) {
      console.log(`Mật khẩu không hợp lệ cho: ${emailOrPhone}`);
      return res.status(401).json({ message: "Sai mật khẩu" });
    }

    // Tạo token mới
    let token;
    try {
      token = createToken(user._id);
      console.log(`Đăng nhập thành công cho: ${user.name}, token đã được tạo`);
    } catch (err) {
      console.error(`Lỗi khi tạo token: ${err.message}`);
      return res.status(500).json({ message: "Lỗi tạo token xác thực" });
    }

    // Trả về thông tin người dùng và token
    res.status(200).json({
      user: {
        _id: user._id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        gender: user.gender,
        birthDate: user.birthDate,
        address: user.address,
        avt:
          user.avt ||
          "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name),
      },
      token,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res
      .status(500)
      .json({ message: "Lỗi trong quá trình đăng nhập", error: error.message });
  }
};

const findUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await userModel.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error finding user:", error);
    res
      .status(500)
      .json({ message: "Error finding user", error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await userModel.find().select("-password");

    res.status(200).json(user);
  } catch (error) {
    console.error("Error finding user:", error);
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  const { name, phone, email, gender, birthDate, address, otp, avt } = req.body;
  const userId = req.params.userId;

  try {
    const updates = {};

    // Nếu có thay đổi email và có OTP, kiểm tra OTP trước
    if (email && otp) {
      // Tìm user hiện tại để so sánh email
      const currentUser = await userModel.findById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Nếu email khác so với email cũ, cần xác thực OTP
      if (email !== currentUser.email) {
        // Lấy thông tin xác thực OTP
        const authRecord = await AuthModel.findOne({ userId });
        if (!authRecord) {
          return res
            .status(400)
            .json({ message: "OTP không hợp lệ hoặc đã hết hạn" });
        }

        // Kiểm tra OTP
        if (authRecord.otp !== otp) {
          return res.status(400).json({ message: "OTP không chính xác" });
        }

        // Kiểm tra thời hạn của OTP
        if (authRecord.otpExpiresAt < new Date()) {
          return res.status(400).json({ message: "OTP đã hết hạn" });
        }

        // OTP hợp lệ, thêm email vào updates
        updates.email = email;

        // Xóa OTP đã sử dụng
        await AuthModel.findOneAndUpdate(
          { userId },
          { otp: null, otpExpiresAt: null }
        );
      }
    } else if (email) {
      // Nếu có email mới nhưng không có OTP, yêu cầu OTP
      const currentUser = await userModel.findById(userId);
      if (email !== currentUser.email) {
        return res
          .status(400)
          .json({ message: "Thay đổi email cần xác thực OTP" });
      }
    }

    // Cập nhật các trường khác
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (gender) updates.gender = gender;
    if (birthDate) updates.birthDate = birthDate;
    if (address) updates.address = address;
    if (avt) updates.avt = avt; // Thêm xử lý cập nhật avatar

    console.log("Updating user with data:", updates);

    const user = await userModel.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User updated successfully:", user);
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res
      .status(500)
      .json({ message: "Error updating user", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.user._id; // User ID from the authenticated token

  try {
    const user = await userModel.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
};

const scheduleInactiveUserDeletion = async () => {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const inactiveUsers = await userModel.find({
    updatedAt: { $lt: sixtyDaysAgo },
    isActive: true,
  });

  for (const user of inactiveUsers) {
    // Send email notification
    await sendOtpEmail(
      user.email,
      "Your account will be deleted in 30 days if no activity is detected."
    );

    // Schedule deletion
    setTimeout(async () => {
      const stillInactive = await userModel.findOne({
        _id: user._id,
        updatedAt: { $lt: sixtyDaysAgo },
      });

      if (stillInactive) {
        await userModel.findByIdAndDelete(user._id);
        console.log(`Deleted inactive user: ${user.email}`);
      }
    }, 30 * 24 * 60 * 60 * 1000);
  }
};

// Thêm hàm mới cho việc thay đổi mật khẩu sau khi đăng nhập
const changePassword = async (req, res) => {
  const { currentPassword, newPassword, otp } = req.body;
  const userId = req.user._id; // Lấy từ authMiddleware

  try {
    // Tìm người dùng
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Xác thực mật khẩu hiện tại
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Xác thực OTP
    const authRecord = await AuthModel.findOne({ userId });
    if (
      !authRecord ||
      authRecord.otp !== otp ||
      authRecord.otpExpiresAt < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mã hóa và lưu mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu người dùng
    user.password = hashedPassword;
    await user.save();

    // Xóa OTP sau khi sử dụng
    await AuthModel.findOneAndUpdate(
      { userId },
      { $unset: { otp: "", otpExpiresAt: "" } }
    );

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      message: "Error changing password",
      error: error.message,
    });
  }
};

// Thêm hàm mới cho việc yêu cầu OTP để thay đổi mật khẩu (khi đã đăng nhập)
const requestPasswordChangeOtp = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy từ authMiddleware

    // Tìm người dùng
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Lưu OTP vào AuthModel
    await AuthModel.findOneAndUpdate(
      { userId },
      { otp, otpExpiresAt },
      { upsert: true, new: true }
    );

    // Gửi OTP qua email
    await sendOtpEmail(user.email, otp, "password_change");

    res.status(200).json({ message: "Password change OTP sent to your email" });
  } catch (error) {
    console.error("Error requesting password change OTP:", error);
    res.status(500).json({
      message: "Error requesting password change OTP",
      error: error.message,
    });
  }
};

const requestEmailChangeOtp = async (req, res) => {
  const { newEmail } = req.body;
  const userId = req.user._id; // From the authentication middleware

  try {
    // Validate email format
    if (!validator.isEmail(newEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if email is already used by another account
    const existingUser = await userModel.findOne({
      email: newEmail,
      _id: { $ne: userId },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email is already used by another account" });
    }

    // Generate OTP
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Save OTP and new email to Auth model
    await AuthModel.findOneAndUpdate(
      { userId },
      {
        otp,
        otpExpiresAt,
        email: newEmail, // Store the new email temporarily
      },
      { upsert: true, new: true }
    );

    // Send OTP to the NEW email address
    await sendOtpEmail(newEmail, otp, "email_change");

    res.status(200).json({ message: "OTP sent to your new email address" });
  } catch (error) {
    console.error("Error requesting email change OTP:", error);
    res.status(500).json({
      message: "Error requesting email change OTP",
      error: error.message,
    });
  }
};

const verifyEmailChangeOtp = async (req, res) => {
  const { otp } = req.body;
  const userId = req.user._id;

  try {
    // Find auth record with OTP and user ID
    const authRecord = await AuthModel.findOne({ userId });

    // Verify the OTP exists and is valid
    if (
      !authRecord ||
      !authRecord.otp ||
      authRecord.otp !== otp ||
      !authRecord.email
    ) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if OTP is expired
    if (authRecord.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // OTP is valid - update user's email
    const newEmail = authRecord.email;
    const user = await userModel.findByIdAndUpdate(
      userId,
      { email: newEmail },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Clear OTP and temporary email after successful verification
    await AuthModel.findOneAndUpdate(
      { userId },
      { $unset: { otp: "", otpExpiresAt: "", email: "" } }
    );

    res.status(200).json({
      message: "Email updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error verifying email change OTP:", error);
    res.status(500).json({
      message: "Error verifying email change OTP",
      error: error.message,
    });
  }
};

const searchUsers = async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    const users = await userModel
      .find({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { phone: { $regex: query, $options: "i" } },
        ],
      })
      .select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Error searching users", error });
  }
};

// xử lý upload avatar
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp đường dẫn hình ảnh" });
    }

    const user = await userModel.findByIdAndUpdate(
      userId,
      { avt: avatarUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.status(200).json({
      message: "Cập nhật avatar thành công",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        birthDate: user.birthDate,
        address: user.address,
        avt: user.avt,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật avatar:", error);
    res.status(500).json({
      message: "Lỗi khi cập nhật avatar",
      error: error.message,
    });
  }
};

// get thông tin người dùng theo ID
const getUserById = async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await userModel.findById(userId).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      birthDate: user.birthDate,
      address: user.address,
      avt: user.avt,
      role: user.role,
      isOnline: user.isOnline || false,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error);
    res.status(500).json({
      message: "Lỗi khi tải thông tin người dùng",
      error: error.message,
    });
  }
};

// Thêm endpoint mới để test cấu hình email
const testEmailConfig = async (req, res) => {
  try {
    // Kiểm tra kết nối đến server email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Kiểm tra kết nối
    await transporter.verify();

    // Log các cài đặt email (chỉ trong môi trường phát triển)
    if (process.env.NODE_ENV !== "production") {
      console.log("Email configuration:", {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER
          ? `${process.env.EMAIL_USER.substring(0, 3)}...`
          : "not set",
        from: process.env.EMAIL_FROM_ADDRESS
          ? `${process.env.EMAIL_FROM_ADDRESS.substring(0, 3)}...`
          : "not set",
      });
    }

    res.status(200).json({
      success: true,
      message: "Email server connection successful",
    });
  } catch (error) {
    console.error("Email server connection failed:", error);
    res.status(500).json({
      success: false,
      message: "Email server connection failed",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  findUser,
  getUser,
  requestOtp,
  sendRegistrationOtp,
  resetPassword,
  updateUser,
  deleteUser,
  scheduleInactiveUserDeletion,
  changePassword,
  requestPasswordChangeOtp,
  searchUsers,
  uploadAvatar,
  getUserById,
  requestEmailChangeOtp,
  verifyEmailChangeOtp,
  testEmailConfig,
};
