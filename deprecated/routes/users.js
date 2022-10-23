const express = require("express");
const { createUser, usersCount } = require("../controllers/users");

const router = express.Router();

router.post("/", createUser);
router.get("/count", usersCount);

module.exports = router;
