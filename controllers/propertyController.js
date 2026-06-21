import cloudinary from "../config/cloudnary.js";
import { Property } from "../models/Property.js";

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
      city,
      country,
      listingType,
      propertyType,
      status,
      minPrice,
      maxPrice,
      bedrooms,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (city) filter.city = { $regex: city, $options: "i" };
    if (country) filter.country = { $regex: country, $options: "i" };
    if (listingType) filter.listingType = listingType;
    if (propertyType) filter.propertyType = propertyType;
    if (status) filter.status = status;
    if (bedrooms) filter.bedrooms = Number(bedrooms);
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);

    const properties = await Property.find(filter)
      .populate("createdBy", "name email phoneNumber")
      .sort({ createdAt: -1 })
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
    const property = await Property.findById(req.params.id).populate(
      "createdBy",
      "name email phoneNumber"
    );

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

    // Only owner can update
    if (property.createdBy.toString() !== req.user._id.toString()) {
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

    // Only owner can delete
    if (property.createdBy.toString() !== req.user._id.toString()) {
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
    const properties = await Property.find({ createdBy: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      total: properties.length,
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
