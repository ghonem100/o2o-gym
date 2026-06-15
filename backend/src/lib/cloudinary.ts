import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
  return true;
}

export function isCloudinaryConfigured(): boolean {
  return ensureConfigured();
}

/**
 * Uploads a base64 data URL (e.g. "data:image/jpeg;base64,...") to Cloudinary
 * and returns the secure URL.
 */
export async function uploadImage(dataUrl: string, folder = 'o2o-gym/members'): Promise<string> {
  if (!ensureConfigured()) {
    throw new Error('Cloudinary is not configured');
  }
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 600, height: 600, crop: 'fill', gravity: 'face' }],
  });
  logger.info('Image uploaded to Cloudinary', { publicId: result.public_id });
  return result.secure_url;
}
