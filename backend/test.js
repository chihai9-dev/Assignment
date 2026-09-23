const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Đang kết nối để lấy dữ liệu...');

  // Thay 'tenBangCuaBan' bằng tên model của bạn (ví dụ: user, product, book...)
  // findMany() sẽ lấy ra toàn bộ danh sách
  const data = await prisma.Order.findMany({
    take: 5, // Chỉ lấy thử 5 dòng đầu tiên để test
  });
  
  console.log('Dữ liệu lấy được từ PostgreSQL:');
  console.dir(data, { depth: null });
}

main()
  .catch((e) => {
    console.error('Lỗi khi truy vấn:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });