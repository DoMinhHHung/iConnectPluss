const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const friendshipRoute = require("./Routes/friendshipRoute");
const searchRoute = require("./Routes/searchRoute");
const userRoute = require("./Routes/userRoute");
const chatRoute = require("./Routes/chatRoute");
const groupRoute = require("./Routes/groupRoute");

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Đăng ký các routes API - cập nhật để khớp với index.js
app.use("/api/auth", userRoute);
app.use("/api/user", userRoute);
app.use("/api/friendship", friendshipRoute);
app.use("/api/friends", friendshipRoute);
app.use("/api/groups", groupRoute);
app.use("/api/chat", chatRoute);
app.use("/api/search", searchRoute);

// Khởi động server
const PORT = 3005;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
