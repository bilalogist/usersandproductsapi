var express = require("express");
var router = express.Router();
var controller = require("../controller/user");
router.post("/signup", controller.signUp);
router.post("/refresh", controller.refreshToken);
router.post("/login", controller.login);
router.post("/forgotPassword", controller.forgotPassword);
router.post("/resetPassword", controller.resetPassword);
router.get("/get", controller.authenticate, controller.getPosts);
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});
module.exports = router;
