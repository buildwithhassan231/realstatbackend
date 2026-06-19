import express from "express"
import dotenv from "dotenv"
import { connectdb } from "./config/db.js";
import { Login, register } from "./controllers/authController.js";

const app = express();

dotenv.config();
connectdb();

app.use(express.json());

app.post("/api/register" , register);
app.post("/api/login" , Login);

app.listen(process.env.PORT, ()=>{
    console.log("server is running on port ", process.env.PORT )
})
