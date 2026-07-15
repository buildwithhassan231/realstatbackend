import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectdb } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminSettingsRoutes from "./routes/adminSettingsRoutes.js";
import { getAllCategories } from "./controllers/adminController.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

const app = express();

// CORS — frontend ko allow karo
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true, // cookies ke liye zaroori hai
}));

app.use(express.json());
app.use(cookieParser());

connectdb();

app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminSettingsRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/users", userRoutes);

// Public categories
app.get("/api/categories", getAllCategories);

// Error handling — must be last
app.use(notFound);
app.use(errorHandler);

// app.listen(process.env.PORT, () => {
//   console.log("server is running on port ", process.env.PORT);
// });

export default app;