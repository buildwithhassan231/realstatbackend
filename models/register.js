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
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
    },

    role: {
      type: String,
      enum: ["buyer", "agent"],
      default: "buyer",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    // Agent profile fields
    profileImage: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    bio: {
      type: String,
      default: "",
    },
    agencyName: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const UserRegisterSchema = mongoose.model("User", registerSchema);
