const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
    if(isConnected) {
        return
    }

    try {
        await mongoose.connect(process.env.MONGO_URI,{
            serverSelectionTimeoutMS: 5000
        });
        isConnected = true
        console.log("Connected to database");
        
    } catch (error) {
        console.error("error connection database :" , error);
        throw error
    }
}

module.exports = connectDB
