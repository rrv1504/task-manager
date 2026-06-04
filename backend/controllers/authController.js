const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const sendAuthResponse = (res, user, statusCode = 200) => {
  res.status(statusCode).json({
    token: createToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      const error = new Error("Name, email, and password are required.");
      error.status = 400;
      throw error;
    }

    if (password.length < 6) {
      const error = new Error("Password must be at least 6 characters.");
      error.status = 400;
      throw error;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("An account with this email already exists.");
      error.status = 409;
      throw error;
    }

    const user = await User.create({ name, email, password });
    sendAuthResponse(res, user, 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("Email and password are required.");
      error.status = 400;
      throw error;
    }

    const user = await User.findOne({ email });
    const passwordMatches = user ? await user.matchPassword(password) : false;

    if (!user || !passwordMatches) {
      const error = new Error("Invalid email or password.");
      error.status = 401;
      throw error;
    }

    sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
};

const me = (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    }
  });
};

module.exports = { register, login, me };
