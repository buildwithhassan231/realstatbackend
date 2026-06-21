import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { connectdb } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";

const app = express();
app.use(express.json());

connectdb();

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);

app.listen(process.env.PORT, () => {
  console.log("server is running on port ", process.env.PORT);
});
