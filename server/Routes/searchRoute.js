const express = require("express");
const router = express.Router();
const {
  search,
  searchUsers,
  searchGroups,
  searchByName,
} = require("../controllers/searchController");
const { authMiddleware } = require("../Middlewares/authMiddleware");

router.get("/users", authMiddleware, searchUsers);
router.get("/groups", authMiddleware, searchGroups);
router.get("/by-name/:name", authMiddleware, searchByName);
router.get("/", authMiddleware, search);

module.exports = router;
