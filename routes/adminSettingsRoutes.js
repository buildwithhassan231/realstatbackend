import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  getSettings,
  updateGeneralSettings,
  updatePlatformSettings,
  updateListingSettings,
  updateAdminProfile,
  changeAdminPassword,
} from "../controllers/adminSettingsController.js";

const router = express.Router();

// Apply auth and admin check middleware to all settings routes
router.use(protect, authorize("admin"));

router.get("/settings", getSettings);
router.put("/settings/general", updateGeneralSettings);
router.put("/settings/platform", updatePlatformSettings);
router.put("/settings/listings", updateListingSettings);

router.put("/profile", updateAdminProfile);
router.put("/change-password", changeAdminPassword);

export default router;
