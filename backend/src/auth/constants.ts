// Khóa bí mật ký JWT. Khi triển khai thật hãy đặt biến môi trường JWT_SECRET (xem .env.example)
export const JWT_SECRET = process.env.JWT_SECRET ?? 'brewlite-dev-secret-change-me';
export const JWT_EXPIRES_IN = '1d';
