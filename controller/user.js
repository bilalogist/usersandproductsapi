require("dotenv").config();
const jwt = require("jsonwebtoken");
const apiResponse = require("../helper/apiResponse");
const bcrypt = require("bcryptjs");
const refreshTokens = [];
const UserSchema = require("../models/userModel");
const nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SECURE_EMAIL,
    pass: process.env.SECURE_KEY,
  },
});
module.exports = {
  signUp: async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    if (password !== confirmPassword)
      apiResponse(res, null, true, "Password Doesnt Match", "FORBIDDEN");
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const u = new UserSchema({ email, password: hashedPassword });
      const user = await u.save();
      var mailOptions = {
        from: process.env.SECURE_EMAIL,
        to: email,
        subject: "SUCCESS SIGNUP",
        text: "Welcome your account has been created!",
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
      apiResponse(res, { user }, false, "Success", "OK");
    } catch (err) {
      apiResponse(res, null, true, err, "FORBIDDEN");
    }
  },
  authenticate: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) apiResponse(res, null, true, "No token", "FORBIDDEN");
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, email) => {
      if (err) apiResponse(res, null, true, err, "FORBIDDEN");
      req.email = email;
      next();
    });
  },
  login: async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    try {
      const user = await UserSchema.findOne({ email: email });
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const accessToken = createToken(email);
        apiResponse(res, { accessToken }, false, "Logged In", "OK");
      } else apiResponse(res, null, true, "InValid Password", "FORBIDDEN");
    } catch (err) {
      apiResponse(res, { err }, true, "Something went wrong", "FORBIDDEN");
    }

    // const refreshToken = createRefreshToken(username);
    // refreshTokens.push(refreshToken);
    // apiResponse(res, { accessToken, token: refreshToken }, false, null, "OK");
  },
  getPosts: (req, res, next) => {
    apiResponse(res, req.email, false, null, "OK");
  },
  refreshToken: (req, res, next) => {
    const refreshToken = req.body.token;
    if (refreshToken == null)
      apiResponse(res, null, true, "No Refresh Token Found", "FORBIDDEN");

    if (refreshTokens.includes(refreshToken)) {
      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, data) => {
          if (err) apiResponse(res, err, true, null, "FORBIDDEN");
          const token = createToken({ name: data.name });
          apiResponse(res, { token, refreshToken }, false, null, "OK");
        }
      );
    } else {
      apiResponse(res, null, true, "Refresh Token not Found", "FORBIDDEN");
    }
  },
  forgotPassword: async (req, res, next) => {
    const email = req.body.email;
    console.log(req.body);

    try {
      const user = await UserSchema.findOne({ email: email });
      if (user) {
        const token = createForgotToken(email);
        console.log(token);
        var mailOptions = {
          from: "noreply@bmail.com",
          to: email,
          subject: "FORGOT LINK",
          html: `<h5>Following is the password reset link which will expire in 20 minutes</h5>
          <a href="localhost:3021/resetpassword/?token=${token}">localhost:3021/resetpassword/${token}</a>
          `,
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            throw err;
          } else {
            console.log("Email sent: " + info.response);
            apiResponse(res, null, false, "Email send with reset link", "OK");
          }
        });
      }
    } catch (err) {
      apiResponse(res, null, true, err, "FORBIDDEN");
    }
  },
  resetPassword: (req, res, next) => {
    const token = req.query.token;
    const newPassword = req.body.password;
    if (!newPassword) {
      apiResponse(res, null, true, "New Password not found", "FORBIDDEN");
    }
    jwt.verify(token, process.env.RESET_TOKEN_SECRET, async (err, email) => {
      try {
        if (err) apiResponse(res, null, true, err, "FORBIDDEN");
        const passHash = await bcrypt.hash(newPassword, 12);
        const user = await UserSchema.findOneAndUpdate(
          { email: email.data },
          { password: passHash }
        );
        apiResponse(res, null, false, "Password Updated", "OK");
      } catch (err) {
        apiResponse(res, null, true, err, "FORBIDDEN");
      }
    });
  },
};

const createToken = (data) => {
  return jwt.sign({ data }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1m",
  });
};

const createForgotToken = (data) => {
  return jwt.sign({ data }, process.env.RESET_TOKEN_SECRET, {
    expiresIn: "20m",
  });
};

const createRefreshToken = (username) => {
  return jwt.sign(username, process.env.REFRESH_TOKEN_SECRET);
};
