import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} catch (error) {
  console.error("Cloudinary configuration error:", error);
}

/**
 * Uploads a file buffer to Cloudinary
 * @param {Buffer} fileBuffer
 * @param {String} mimetype
 * @returns cloudinary upload result
 */
export async function uploadToCloudinary(fileBuffer, mimetype) {
  const b64 = Buffer.from(fileBuffer).toString("base64");
  const dataURI = `data:${mimetype};base64,${b64}`;

  return cloudinary.uploader.upload(dataURI, {
    folder: "avatars",
    resource_type: "auto",
  });
}

export { cloudinary };
