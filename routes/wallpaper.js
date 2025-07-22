const express = require("express");
const router = express.Router();
const updateWallpaper = require("../controller/updateWallpaper");

// ✅ Endpoint: POST /api/user/update-wallpaper
router.post("/update-wallpaper", updateWallpaper);

module.exports = router;
