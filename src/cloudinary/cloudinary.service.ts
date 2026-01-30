import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    if (cloudinaryUrl) {
      try {
        const u = new URL(cloudinaryUrl);
        const cloudName = u.hostname;
        const apiKey = decodeURIComponent(u.username);
        const apiSecret = decodeURIComponent(u.password);

        if (!cloudName || !apiKey || !apiSecret)
          throw new Error('Invalid CLOUDINARY_URL');

        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });

        return;
      } catch {
        throw new InternalServerErrorException('CLOUDINARY_URL inválida.');
      }
    }

    // Fallback por si algún día usas variables separadas
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Faltan variables de Cloudinary. Usa CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  async uploadDepositProof(params: {
    file: Express.Multer.File;
    userId: string;
    depositId: string;
    referenceCode: string;
  }): Promise<{ secureUrl: string; publicId: string }> {
    const { file, userId, depositId } = params;

    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (!isImage && !isPdf) {
      throw new InternalServerErrorException('Tipo de archivo no soportado.');
    }

    const resourceType: 'image' | 'raw' = isImage ? 'image' : 'raw';
    const folder = `hunboli/users/${userId}/deposits/${depositId}`;
    const publicId = `proof_${Date.now()}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, resource_type: resourceType },
        (error, result) => {
          if (error || !result?.secure_url) {
            return reject(
              new InternalServerErrorException(
                'No se pudo subir el comprobante a Cloudinary.',
              ),
            );
          }
          resolve({ secureUrl: result.secure_url, publicId: result.public_id });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadVerificationFile(params: {
    file: Express.Multer.File;
    userId: string;
  }): Promise<{ secureUrl: string; publicId: string }> {
    const { file, userId } = params;
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (!isImage && !isPdf) {
      throw new InternalServerErrorException('Tipo de archivo no soportado.');
    }
    const resourceType: 'image' | 'raw' = isImage ? 'image' : 'raw';
    const folder = `hunboli/users/${userId}/deposits/verification`;
    const publicId = `proof_${Date.now()}`;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, resource_type: resourceType },
        (error, result) => {
          if (error || !result?.secure_url) {
            return reject(
              new InternalServerErrorException(
                'No se pudo subir el comprobante a Cloudinary.',
              ),
            );
          }
          resolve({ secureUrl: result.secure_url, publicId: result.public_id });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadWithdrawalProof(params: {
  file: Express.Multer.File;
  userId: string;
  withdrawalId: string;
}): Promise<{ secureUrl: string; publicId: string }> {
  const { file, userId, withdrawalId } = params;

  // Validar tipo de archivo
  const isImage = file.mimetype.startsWith('image/');
  const isPdf = file.mimetype === 'application/pdf';
  if (!isImage && !isPdf) {
    throw new InternalServerErrorException('Tipo de archivo no soportado.');
  }

  const resourceType: 'image' | 'raw' = isImage ? 'image' : 'raw';
  const folder = `hunboli/users/${userId}/withdrawals/${withdrawalId}`;
  const publicId = `proof_${Date.now()}`;

  // Subida a Cloudinary
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: resourceType },
      (error, result) => {
        if (error || !result?.secure_url) {
          return reject(
            new InternalServerErrorException(
              'No se pudo subir el comprobante de retiro a Cloudinary.',
            ),
          );
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );

    uploadStream.end(file.buffer);
  });
}
}
