-- =====================================================================
-- BrewLite - Seed Data (PostgreSQL)
-- Dữ liệu mẫu khởi tạo chuẩn cho bài tập lớn Công nghệ Phần mềm
-- Quy chuẩn: Mỗi bảng ~3 dòng, riêng bảng Product có đúng 12 sản phẩm
-- Mật khẩu mẫu: barista123 (cho Barista), customer123 & password123 (cho Khách hàng)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. BẢNG Category (4 danh mục mẫu đồ uống)
-- ---------------------------------------------------------------------
INSERT INTO "Category" (id, name, "createdAt", "updatedAt") VALUES
    (1, 'Cà phê',                  now(), now()),
    (2, 'Trà trái cây',             now(), now()),
    (3, 'Trà sữa',                 now(), now()),
    (4, 'Đá xay & Thức uống khác', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. BẢNG User (3 tài khoản mẫu đã hash bcrypt sẵn)
--   - barista@brewlite.com  -> barista123 (Role: barista)
--   - customer@brewlite.com -> customer123 (Role: customer)
--   - khachhang2@example.com -> password123 (Role: customer)
-- ---------------------------------------------------------------------
INSERT INTO "User" (id, email, "passwordHash", "loyaltyPoints", role, "createdAt", "updatedAt") VALUES
    (1, 'barista@brewlite.com',   '$2b$10$mP5dJ.qWueg02XGw/Bu/AevZNCBtware14sA3KYotm2IgfCBoUv7e', 100, 'barista',  now(), now()),
    (2, 'customer@brewlite.com',  '$2b$10$ptgUmawGGT9c4RLeqIoLx.OQj6vuIOfjrhOq/clKVgO5cNhPTyvF2',  50, 'customer', now(), now()),
    (3, 'khachhang2@example.com', '$2b$10$vaMHsq05UxbqkciIo9skZes9eoqKkO3wHyIx3ZYY76GvDHvM5lj4m',  20, 'customer', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. BẢNG Product (ĐÚNG 12 SẢN PHẨM PHÂN BỔ ĐỀU CÁC DANH MỤC)
-- ---------------------------------------------------------------------
INSERT INTO "Product" (id, "categoryId", name, price, "imageUrl", stock, version, status, "createdAt", "updatedAt") VALUES
    -- [Nhóm Cà phê - CategoryId = 1]
    (1, 1, 'Cà phê sữa đá',              35000.00, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=60', 100, 0, 'active', now(), now()),
    (2, 1, 'Americano',                  40000.00, 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=600&auto=format&fit=crop&q=60',  80, 0, 'active', now(), now()),
    (3, 1, 'Cappuccino',                 45000.00, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=60',  60, 0, 'active', now(), now()),
    (4, 1, 'Bạc xỉu 3 tầng',             38000.00, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&auto=format&fit=crop&q=60',  90, 0, 'active', now(), now()),
    (5, 1, 'Caramel Macchiato',          48000.00, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=60',  50, 0, 'active', now(), now()),

    -- [Nhóm Trà trái cây - CategoryId = 2]
    (6, 2, 'Trà đào cam sả',             39000.00, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=60', 100, 0, 'active', now(), now()),
    (7, 2, 'Trà vải lài thanh long',     42000.00, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=60',  75, 0, 'active', now(), now()),
    (8, 2, 'Trà sen vàng hạt sen',       45000.00, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=60',  65, 0, 'active', now(), now()),

    -- [Nhóm Trà sữa - CategoryId = 3]
    (9, 3, 'Trà sữa Oolong nướng',       42000.00, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=60', 120, 0, 'active', now(), now()),
    (10, 3, 'Trà sữa trân châu đường đen', 45000.00, 'https://images.unsplash.com/photo-1558857563-b37cf5a41764?w=600&auto=format&fit=crop&q=60', 110, 0, 'active', now(), now()),
    (11, 3, 'Trà sữa Matcha kem cheese', 48000.00, 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=60',  85, 0, 'active', now(), now()),

    -- [Nhóm Đá xay & Khác - CategoryId = 4]
    (12, 4, 'Cà phê dừa đá xay',         49000.00, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=60',  70, 0, 'active', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. BẢNG Topping (3 món topping thêm)
-- ---------------------------------------------------------------------
INSERT INTO "Topping" (id, name, price, "isAvailable", "createdAt") VALUES
    (1, 'Trân châu đen hoàng gia',  5000, true, now()),
    (2, 'Kem cheese (Macchiato)',  10000, true, now()),
    (3, 'Thạch dừa non giòn',       5000, true, now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. BẢNG Order (3 đơn hàng minh họa các trạng thái chính)
--   - Đơn 1: Đã hoàn thành (COMPLETED)
--   - Đơn 2: Đã thanh toán (PAID)
--   - Đơn 3: Mới tạo chờ thanh toán (PENDING)
-- ---------------------------------------------------------------------
INSERT INTO "Order" (id, "userId", status, total, "createdAt", "updatedAt") VALUES
    (1, 2, 'COMPLETED', 90000.00, now() - interval '2 day',    now() - interval '2 day'),
    (2, 2, 'PAID',      47000.00, now() - interval '1 hour',   now() - interval '1 hour'),
    (3, 3, 'PENDING',   44000.00, now() - interval '10 minute', now() - interval '10 minute')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. BẢNG OrderItem (4 dòng chi tiết đơn hàng tương ứng)
-- ---------------------------------------------------------------------
INSERT INTO "OrderItem" (id, "orderId", "productId", size, qty, "lineTotal") VALUES
    -- Đơn 1: Cappuccino (M) x1 (45k) + Cà phê sữa đá (M) x1 (35k)
    (1, 1, 3, 'M', 1, 45000.00),
    (2, 1, 1, 'M', 1, 35000.00),
    -- Đơn 2: Trà sữa Oolong nướng (M) x1 (42k)
    (3, 2, 9, 'M', 1, 42000.00),
    -- Đơn 3: Trà đào cam sả (M) x1 (39k)
    (4, 3, 6, 'M', 1, 39000.00)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. BẢNG OrderItemTopping (3 dòng tùy chọn topping cho các món)
-- ---------------------------------------------------------------------
INSERT INTO "OrderItemTopping" ("orderItemId", "toppingId", "priceAtTime") VALUES
    -- Ly Cappuccino ở đơn 1 thêm Kem cheese (+10k) => 45k + 10k + 35k = 90k
    (1, 2, 10000),
    -- Ly Trà sữa Oolong ở đơn 2 thêm Trân châu (+5k) => 42k + 5k = 47k
    (3, 1, 5000),
    -- Ly Trà đào ở đơn 3 thêm Thạch dừa (+5k) => 39k + 5k = 44k
    (4, 3, 5000)
ON CONFLICT ("orderItemId", "toppingId") DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. BẢNG Payment (3 giao dịch thanh toán không tiền mặt)
-- ---------------------------------------------------------------------
INSERT INTO "Payment" (id, "orderId", "idempotencyKey", amount, method) VALUES
    (1, 1, 'idem-brewlite-ord1-wallet-001', 90000.00, 'WALLET'),
    (2, 2, 'idem-brewlite-ord2-card-002',   47000.00, 'CARD'),
    (3, 3, 'idem-brewlite-ord3-wallet-003', 44000.00, 'WALLET')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 9. CẬP NHẬT LẠI SEQUENCE TỰ TĂNG CHO CÁC BẢNG (Tránh lỗi Duplicate ID khi gọi API)
-- ---------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('"Category"', 'id'),  (SELECT COALESCE(MAX(id), 1) FROM "Category"));
SELECT setval(pg_get_serial_sequence('"User"', 'id'),      (SELECT COALESCE(MAX(id), 1) FROM "User"));
SELECT setval(pg_get_serial_sequence('"Product"', 'id'),   (SELECT COALESCE(MAX(id), 1) FROM "Product"));
SELECT setval(pg_get_serial_sequence('"Topping"', 'id'),   (SELECT COALESCE(MAX(id), 1) FROM "Topping"));
SELECT setval(pg_get_serial_sequence('"Order"', 'id'),     (SELECT COALESCE(MAX(id), 1) FROM "Order"));
SELECT setval(pg_get_serial_sequence('"OrderItem"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "OrderItem"));
SELECT setval(pg_get_serial_sequence('"Payment"', 'id'),   (SELECT COALESCE(MAX(id), 1) FROM "Payment"));

COMMIT;
