import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const KEYS_FILE_PATH = path.resolve(process.cwd(), '.vapid-keys.json');

export function getVapidKeys(): VapidKeys {
  // 1. Prefer environment variables
  const pubKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privKey = process.env.VAPID_PRIVATE_KEY;
  if (pubKey && privKey) {
    return {
      publicKey: pubKey,
      privateKey: privKey,
    };
  }

  // 2. Fall back to local persistent file
  try {
    if (fs.existsSync(KEYS_FILE_PATH)) {
      const data = fs.readFileSync(KEYS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data) as VapidKeys;
      if (parsed.publicKey && parsed.privateKey) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error reading VAPID keys file:', error);
  }

  // 3. Generate and persist new keys
  try {
    console.log('No VAPID keys detected. Generating stable VAPID keypair...');
    const keys = webpush.generateVAPIDKeys();
    fs.writeFileSync(KEYS_FILE_PATH, JSON.stringify(keys, null, 2), 'utf-8');
    console.log('Successfully saved VAPID keypair to', KEYS_FILE_PATH);
    return keys;
  } catch (error) {
    console.error('Failed to generate VAPID keys, using temporary hardcoded pair:', error);
    // Temporary emergency fallback to ensure server doesn't crash
    return {
      publicKey: 'BMWkTliVadM8y0G897IiwC1gtHo5yItE0dpt-YqparhZpk0cT3-m9wsXT5BOENt3Lr6MPSh4dz8Cexklw8Ss7Pg',
      privateKey: 's9mRsa8J5zp0D9eDo7F7glzshtx4C41P0epPtoPKw_0'
    };
  }
}
