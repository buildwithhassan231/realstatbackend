import cloudinary from "../config/cloudnary.js";
import { Property } from "../models/Property.js";
import { Inquiry } from "../models/Inquiry.js";

// ─── Helper: upload buffer to Cloudinary ─────────────────────────────────────
const uploadToCloudinary = (buffer, mimetype) => {
  // Configure here — dotenv is guaranteed to be loaded by this point
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "realstate/properties",
        resource_type: "image",
        format: mimetype.split("/")[1], // jpeg / png / webp
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

// ─── Create Property ──────────────────────────────────────────────────────────
export const createProperty = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      propertyType,
      listingType,
      bedrooms,
      bathrooms,
      area,
      address,
      city,
      country,
      lat,
      lng,
      // amenities — sent as individual fields e.g. parking=true
      parking,
      pool,
      gym,
      garden,
      security,
      elevator,
      status,
    } = req.body;

    // Required field check
    if (
      !title || !description || !price || !propertyType ||
      !listingType || !bedrooms || !bathrooms || !area ||
      !address || !city || !country
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Image validation
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 images allowed",
      });
    }

    // Upload all images to Cloudinary in parallel
    const uploadedImages = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, file.mimetype))
    );

    // Build amenities object
    const amenities = {
      parking: parking === "true" || parking === true,
      pool: pool === "true" || pool === true,
      gym: gym === "true" || gym === true,
      garden: garden === "true" || garden === true,
      security: security === "true" || security === true,
      elevator: elevator === "true" || elevator === true,
    };

    const property = await Property.create({
      title,
      description,
      price: Number(price),
      propertyType,
      listingType,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      area: Number(area),
      address,
      city,
      country,
      location: {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      },
      amenities,
      images: uploadedImages,
      status: status || "Available",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ─── Get All Properties ───────────────────────────────────────────────────────
export const getAllProperties = async (req, res) => {
  try {
    const {
      // Search
      keyword,
      // Filters
      city,
      country,
      listingType,
      propertyType,
      status,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      minArea,
      maxArea,
      // Sort
      sortBy = "newest",
      // Pagination
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // Only approved properties public mein
    filter.approvalStatus = "approved";

    // ── Keyword search (title, city, address) ──
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { city: { $regex: keyword, $options: "i" } },
        { address: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    // ── Filters ──
    if (city) filter.city = { $regex: city, $options: "i" };
    if (country) filter.country = { $regex: country, $options: "i" };
    if (listingType) filter.listingType = listingType;
    if (propertyType) filter.propertyType = propertyType;
    if (status) filter.status = status;
    if (bedrooms) filter.bedrooms = Number(bedrooms);
    if (bathrooms) filter.bathrooms = Number(bathrooms);

    // ── Price range ──
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // ── Area range ──
    if (minArea || maxArea) {
      filter.area = {};
      if (minArea) filter.area.$gte = Number(minArea);
      if (maxArea) filter.area.$lte = Number(maxArea);
    }

    // ── Sort ──
    let sortOption = {};
    switch (sortBy) {
      case "price_asc":   sortOption = { price: 1 };       break;
      case "price_desc":  sortOption = { price: -1 };      break;
      case "most_viewed": sortOption = { views: -1 };      break;
      case "oldest":      sortOption = { createdAt: 1 };   break;
      case "newest":
      default:            sortOption = { createdAt: -1 };  break;
    }

    // ── Pagination ──
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);

    const properties = await Property.find(filter)
      .populate("createdBy", "name email phoneNumber")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: properties,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ─── Get Single Property ──────────────────────────────────────────────────────
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },  // increment view on every visit
      { new: true }
    ).populate("createdBy", "name email phoneNumber");

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    return res.status(200).json({ success: true, data: property });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ─── Update Property ──────────────────────────────────────────────────────────
export const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // Only owner or admin can update
    const isOwner = property.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this property",
      });
    }

    // If new images uploaded, upload to cloudinary
    if (req.files && req.files.length > 0) {
      const totalImages = property.images.length + req.files.length;
      if (totalImages > 10) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more images. Current: ${property.images.length}, max allowed: 10`,
        });
      }

      const newImages = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, file.mimetype))
      );
      req.body.images = [...property.images, ...newImages];
    }

    // Parse amenities if sent as flat fields
    if (req.body.parking !== undefined || req.body.pool !== undefined) {
      req.body.amenities = {
        parking: req.body.parking === "true" || req.body.parking === true,
        pool: req.body.pool === "true" || req.body.pool === true,
        gym: req.body.gym === "true" || req.body.gym === true,
        garden: req.body.garden === "true" || req.body.garden === true,
        security: req.body.security === "true" || req.body.security === true,
        elevator: req.body.elevator === "true" || req.body.elevator === true,
      };
    }

    const updated = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true, returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: updated,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ─── Delete Property ──────────────────────────────────────────────────────────
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // Only owner or admin can delete
    const isOwner = property.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this property",
      });
    }

    // Delete all images from Cloudinary
    await Promise.all(
      property.images.map((img) =>
        cloudinary.uploader.destroy(img.public_id)
      )
    );

    await property.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ─── Get My Properties ────────────────────────────────────────────────────────
export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ createdBy: req.user._id })
      .populate("createdBy", "name email phoneNumber profileImage agencyName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: properties.length,
      data: properties,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      data: {},
      message: "Internal Server Error",
    });
  }
};

// ─── Admin: Get All Pending Properties ───────────────────────────────────────
export const getPendingProperties = async (req, res) => {
  try {
    const properties = await Property.find({ approvalStatus: "pending" })
      .populate("createdBy", "name email phoneNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: properties.length,
      data: properties,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ─── Admin: Approve Property ──────────────────────────────────────────────────
export const approveProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    property.approvalStatus = "approved";
    property.rejectionReason = null;
    await property.save();

    return res.status(200).json({
      success: true,
      message: "Property approved successfully",
      data: property,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ─── Admin: Reject Property ───────────────────────────────────────────────────
export const rejectProperty = async (req, res) => {
  try {
    const { reason } = req.body;

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    property.approvalStatus = "rejected";
    property.rejectionReason = reason || "No reason provided";
    await property.save();

    return res.status(200).json({
      success: true,
      message: "Property rejected",
      data: property,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ─── Admin: Toggle Featured ───────────────────────────────────────────────────
export const toggleFeatured = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // Only approved properties can be featured
    if (property.approvalStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved properties can be marked as featured",
      });
    }

    property.isFeatured = !property.isFeatured;
    await property.save();

    return res.status(200).json({
      success: true,
      message: property.isFeatured
        ? "Property marked as featured"
        : "Property removed from featured",
      data: property,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ─── Public: Get Featured Properties (Homepage) ───────────────────────────────
export const getFeaturedProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      isFeatured: true,
      approvalStatus: "approved",
    })
      .populate("createdBy", "name email phoneNumber")
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      total: properties.length,
      data: properties,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ─── Agent Dashboard ──────────────────────────────────────────────────────────
export const getAgentDashboard = async (req, res) => {
  try {
    const agentId = req.user._id;

    const properties = await Property.find({ createdBy: agentId });

    const totalProperties = properties.length;
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalInquiries = await Inquiry.countDocuments({
      property: { $in: properties.map((p) => p._id) },
    });

    const statusBreakdown = {
      available: properties.filter((p) => p.status === "Available").length,
      sold: properties.filter((p) => p.status === "Sold").length,
      rented: properties.filter((p) => p.status === "Rented").length,
    };

    const approvalBreakdown = {
      pending: properties.filter((p) => p.approvalStatus === "pending").length,
      approved: properties.filter((p) => p.approvalStatus === "approved").length,
      rejected: properties.filter((p) => p.approvalStatus === "rejected").length,
    };

    // Top 5 most viewed properties
    const topProperties = await Property.find({ createdBy: agentId })
      .sort({ views: -1 })
      .limit(5)
      .select("title price city status views approvalStatus");

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalProperties,
          totalViews,
          totalInquiries,
        },
        statusBreakdown,
        approvalBreakdown,
        topProperties,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
