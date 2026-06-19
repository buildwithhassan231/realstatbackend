import mongoose from "mongoose";

const registerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    phoneNumber: {
      type: Number,
      required: [true, "Phone number is required"],
      unique: true,
    },

    role: {
      type: String,
      enum: ["Buyer", "agent"],
      default: "Buyer",
    },
  },
  {
    timestamps: true,
  }
);

export const UserRegisterSchema = mongoose.model("User", registerSchema);