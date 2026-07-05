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
    whatsapp: {
      type: String,
      default: "",
    },
    experience: {
      type: Number,   // years of experience
      default: 0,
    },
    specializations: {
      type: [String], // e.g. ["Villa", "Apartment", "Commercial"]
      default: [],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    deals: {
      type: Number,   // total completed deals
      default: 0,
    },
    rating: {
      average: { type: Number, default: 0 },
      count:   { type: Number, default: 0 },
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
