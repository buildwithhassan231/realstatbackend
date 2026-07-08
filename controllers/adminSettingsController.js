import { Setting } from "../models/Setting.js";
import { UserRegisterSchema as User } from "../models/register.js";
import bcrypt from "bcrypt";

// GET /api/admin/settings
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/settings/general
export const updateGeneralSettings = async (req, res, next) => {
  try {
    const { siteName, siteUrl, siteTagline, contactEmail, supportPhone } = req.body;
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    if (siteName !== undefined) settings.siteName = siteName;
    if (siteUrl !== undefined) settings.siteUrl = siteUrl;
    if (siteTagline !== undefined) settings.siteTagline = siteTagline;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (supportPhone !== undefined) settings.supportPhone = supportPhone;

    await settings.save();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/settings/platform
export const updatePlatformSettings = async (req, res, next) => {
  try {
    const { maintenance, registrations, emailNotifications, autoApprove } = req.body;
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    if (maintenance !== undefined) settings.maintenance = maintenance;
    if (registrations !== undefined) settings.registrations = registrations;
    if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
    if (autoApprove !== undefined) settings.autoApprove = autoApprove;

    await settings.save();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/settings/listings
export const updateListingSettings = async (req, res, next) => {
  try {
    const { featuredLimit, listingsPerPage, maxImages } = req.body;
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    if (featuredLimit !== undefined) settings.featuredLimit = featuredLimit;
    if (listingsPerPage !== undefined) settings.listingsPerPage = listingsPerPage;
    if (maxImages !== undefined) settings.maxImages = maxImages;

    await settings.save();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/profile
export const updateAdminProfile = async (req, res, next) => {
  try {
    const { adminName, adminEmail, adminPhone, adminBio } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (adminName !== undefined) user.name = adminName;
    if (adminEmail !== undefined) user.email = adminEmail;
    if (adminPhone !== undefined) user.phoneNumber = adminPhone;
    if (adminBio !== undefined) user.bio = adminBio;

    await user.save();
    
    const updatedUser = await User.findById(req.user._id).select("-password");

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/change-password
export const changeAdminPassword = async (req, res, next) => {
  try {
    const { curPwd, newPwd, conPwd } = req.body;

    if (!curPwd || !newPwd || !conPwd) {
      return res.status(400).json({ success: false, message: "Please provide all password fields" });
    }

    if (newPwd !== conPwd) {
      return res.status(400).json({ success: false, message: "New password and confirm password do not match" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(curPwd, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPwd, salt);

    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};
