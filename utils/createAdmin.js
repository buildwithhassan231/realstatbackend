// Run this script once to create admin user:
// node utils/createAdmin.js

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { UserRegisterSchema } from "../models/register.js";

// create admin
const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const existing = await UserRegisterSchema.findOne({ email: "admin@realstate.com" });
    if (existing) {
      console.log("Admin already exists:", existing.email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    const admin = await UserRegisterSchema.create({
      name: "Super Admin",
      email: "admin@realstate.com",
      password: hashedPassword,
      phoneNumber: 3000000000,
    });

    // Directly set role to admin (bypasses enum restriction)
    await UserRegisterSchema.updateOne(
      { _id: admin._id },
      { $set: { role: "admin" } }
    );

    console.log("✅ Admin created successfully");
    console.log("   Email   : admin@realstate.com");
    console.log("   Password: Admin@123");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

createAdmin();
