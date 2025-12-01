// // config/mongo.js
// import mongoose from "mongoose";

// const connectMongoDB = async () => {
//   try {
//     await mongoose.connect("mongodb://127.0.0.1:27017/ICAI_DB");

//     console.log("✅ Connected to MongoDB successfully!");
//   } catch (error) {
//     console.error("❌ MongoDB connection error:", error.message);
//     process.exit(1);
//   }
// };

// export default connectMongoDB;

// config/mongo.js
import mongoose from "mongoose";

const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error("❌ ERROR: MONGO_URI is missing in Railway Variables");
      process.exit(1);
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectMongoDB;
