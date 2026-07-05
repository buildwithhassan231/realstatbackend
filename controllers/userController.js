import { UserRegisterSchema } from "../models/register.js";
import { Property } from "../models/Property.js";
import cloudinary from "../config/cloudnary.js";
export const getAgentProfile = async (req, res) => {
  try {
    const agent = await UserRegisterSchema.findById(req.params.agentId).select(
      "name email phoneNumber role profileImage bio agencyName createdAt"
    );

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    if (agent.isBlocked) {
      return res.status(403).json({ success: false, message: "This profile is not available" });
    }

    // Get agent's approved properties
    const properties = await Property.find({
      createdBy: agent._id,
      approvalStatus: "approved",
    })
      .sort({ createdAt: -1 })
      .select("title price city propertyType listingType bedrooms bathrooms images status isFeatured views");

    return res.status(200).json({
      success: true,
      data: {
        agent,
        totalListings: properties.length,
        properties,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ─── Update My Profile ────────────────────────────────────────────────────────
export const updateMyProfile = async (req, res) => {
  try {
    const { name, phoneNumber, bio, agencyName, whatsapp, experience, specializations, deals } = req.body;
    const user = await UserRegisterSchema.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bio !== undefined) user.bio = bio;
    if (agencyName !== undefined) user.agencyName = agencyName;
    if (whatsapp !== undefined) user.whatsapp = whatsapp;
    if (experience !== undefined) user.experience = Number(experience);
    if (deals !== undefined) user.deals = Number(deals);
    if (specializations !== undefined) {
      user.specializations = Array.isArray(specializations)
        ? specializations
        : specializations.split(",").map((s) => s.trim());
    }

    // Profile image upload
    if (req.file) {
      // Configure cloudinary
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // Delete old image if exists
      if (user.profileImage?.public_id) {
        await cloudinary.uploader.destroy(user.profileImage.public_id);
      }

      // Upload new image
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "realstate/profiles", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      user.profileImage = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        bio: user.bio,
        agencyName: user.agencyName,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ─── Get All Public Agents ────────────────────────────────────────────────────
export const getAllAgents = async (req, res) => {
  try {
    const { page = 1, limit = 10, city } = req.query;

    const filter = { role: "agent", isBlocked: false };
    if (city) filter.city = { $regex: city, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await UserRegisterSchema.countDocuments(filter);

    const agents = await UserRegisterSchema.find(filter)
      .select("name email phoneNumber whatsapp profileImage bio agencyName city experience specializations verified deals rating createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Har agent ki approved listings + count
    const agentsWithListings = await Promise.all(
      agents.map(async (agent) => {
        const listings = await Property.find({
          createdBy: agent._id,
          approvalStatus: "approved",
        })
          .select("title price city propertyType listingType bedrooms bathrooms area images status isFeatured views")
          .sort({ createdAt: -1 })
          .limit(6); // max 6 listings per agent card

        return {
          ...agent.toObject(),
          totalListings: listings.length,
          listings,
        };
      })
    );

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: agentsWithListings,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
export const getPropertiesByAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 10, listingType, propertyType, status } = req.query;

    const agent = await UserRegisterSchema.findById(agentId).select(
      "name email phoneNumber profileImage bio agencyName"
    );

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    const filter = {
      createdBy: agentId,
      approvalStatus: "approved",
    };

    if (listingType) filter.listingType = listingType;
    if (propertyType) filter.propertyType = propertyType;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);

    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      agent,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: properties,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
