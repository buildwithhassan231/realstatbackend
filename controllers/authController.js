import bcrypt from "bcrypt";
import { UserRegisterSchema } from "../models/register.js";
import jwt from "jsonwebtoken";

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, role, agencyName, city } = req.body;

    // Required fields check
    if (!name || !email || !password || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    // Role validation
    const allowedRoles = ["buyer", "agent"];
    const userRole = role || "buyer";

    if (!allowedRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Check email already exists
    const emailExists = await UserRegisterSchema.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Check phone already exists
    const phoneExists = await UserRegisterSchema.findOne({ phoneNumber });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Phone already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // agencyName aur city sirf agent ke liye
    const isAgent = userRole === "agent";

    const user = await UserRegisterSchema.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber: String(phoneNumber),
      role: userRole,
      agencyName: isAgent ? (agencyName || "") : "",
      city: isAgent ? (city || "") : "",
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        profileImage: user.profileImage?.url || "",
        bio: user.bio,
        agencyName: user.agencyName,
        city: user.city,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error. Try again.",
    });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    // Check user
    const user = await UserRegisterSchema.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,                          // JS se access nahi hoga
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,        // 7 days in ms
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token, // bhi return kar rahe hain — Postman/mobile apps ke liye
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
