const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Authorization token missing or invalid" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const validateUpdateFields = (req, res, next) => {
  const { phone, email, gender } = req.body;

  if (email && !validator.isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (phone && !validator.isMobilePhone(phone, "any", { strictMode: false })) {
    return res.status(400).json({ message: "Invalid phone number" });
  }

  if (gender && !["male", "female"].includes(gender)) {
    return res.status(400).json({ message: "Invalid gender value" });
  }

  next();
};

module.exports = { authMiddleware, validateUpdateFields };
