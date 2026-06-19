import mongoose from "mongoose"

export const connectdb= async()=>{
    try {
        const connect = mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB Connected");
    } catch (error) {
         console.log(error);
    process.exit(1);
    }
}