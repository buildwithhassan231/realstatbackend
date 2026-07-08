import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    // General Settings
    siteName: { type: String, default: "PropFind" },
    siteUrl: { type: String, default: "" },
    siteTagline: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    supportPhone: { type: String, default: "" },

    // Platform Controls
    maintenance: { type: Boolean, default: false },
    registrations: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    autoApprove: { type: Boolean, default: false },

    // Listing Limits
    featuredLimit: { type: Number, default: 10 },
    listingsPerPage: { type: Number, default: 12 },
    maxImages: { type: Number, default: 10 },
  },
  {
    timestamps: true,
  }
);

export const Setting = mongoose.model("Setting", settingSchema);
