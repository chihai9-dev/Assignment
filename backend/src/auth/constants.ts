// Khóa bí mật ký JWT, đọc từ biến môi trường JWT_SECRET (đã khai báo sẵn trong .env.example)
export const JWT_SECRET = process.env.JWT_SECRET ?? 'brewlite-dev-secret-change-me';
export const JWT_EXPIRES_IN = '1d';
