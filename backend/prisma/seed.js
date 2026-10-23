const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang khởi tạo dữ liệu mẫu (Seeding) ---');

  // 1. Tạo tài khoản mẫu nếu chưa có
  const baristaHash = await bcrypt.hash('barista123', 10);
  const customerHash = await bcrypt.hash('customer123', 10);

  await prisma.user.upsert({
    where: { email: 'barista@brewlite.com' },
    update: {},
    create: {
      email: 'barista@brewlite.com',
      passwordHash: baristaHash,
      role: 'barista',
      loyaltyPoints: 100,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@brewlite.com' },
    update: {},
    create: {
      email: 'customer@brewlite.com',
      passwordHash: customerHash,
      role: 'customer',
      loyaltyPoints: 50,
    },
  });

  // 2. Thêm danh sách món cà phê nếu chưa có
  const count = await prisma.product.count();
  if (count === 0) {
    const products = [
      {
        name: 'Cà phê sữa đá',
        price: 35000,
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=60',
        stock: 100,
        status: 'active',
      },
      {
        name: 'Americano',
        price: 40000,
        imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=600&auto=format&fit=crop&q=60',
        stock: 100,
        status: 'active',
      },
      {
        name: 'Cappuccino',
        price: 45000,
        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=60',
        stock: 100,
        status: 'active',
      },
      {
        name: 'Trà đào cam sả',
        price: 39000,
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=60',
        stock: 100,
        status: 'active',
      },
      {
        name: 'Bạc xỉu 3 tầng',
        price: 38000,
        imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&auto=format&fit=crop&q=60',
        stock: 100,
        status: 'active',
      },
      {
        name: 'Trà sữa Oolong nướng',
        price: 42000,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=60',
        stock: 100,
        status: 'active',
      },
    ];

    for (const p of products) {
      await prisma.product.create({ data: p });
    }
    console.log(`Đã thêm ${products.length} sản phẩm mẫu vào menu.`);
  } else {
    console.log('Sản phẩm menu đã tồn tại, bỏ qua bước tạo sản phẩm.');
  }

  // 3. Thêm danh sách Topping nếu chưa có
  const defaultToppings = [
    { name: 'Trân châu', price: 5000, isAvailable: true },
    { name: 'Thạch trái cây', price: 5000, isAvailable: true },
    { name: 'Kem cheese', price: 10000, isAvailable: true },
    { name: 'Pudding trứng', price: 8000, isAvailable: true },
    { name: 'Thạch dừa', price: 5000, isAvailable: true },
  ];

  for (const t of defaultToppings) {
    await prisma.topping.upsert({
      where: { name: t.name },
      update: { price: t.price, isAvailable: t.isAvailable },
      create: t,
    });
  }
  console.log(`Đã đồng bộ ${defaultToppings.length} loại topping vào hệ thống.`);

  console.log('--- Hoàn tất Seeding thành công! ---');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed dữ liệu:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
