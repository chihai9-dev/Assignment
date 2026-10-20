# ☕ BrewLite - Ứng dụng đặt cà phê không dùng tiền mặt (Cashless Coffee Ordering)

> **BrewLite** là nền tảng đặt cà phê và thanh toán không tiền mặt hiện đại, giúp khách hàng trải nghiệm gọi đồ uống nhanh chóng, giảm thiểu thời gian chờ đợi tại quầy và quản lý đơn hàng liền mạch.

---

## 📑 Mục lục
1. [Giới thiệu dự án](#-giới-thiệu-dự-án)
2. [Công nghệ sử dụng (Tech Stack)](#-công-nghệ-sử-dụng-tech-stack)
3. [Kiến trúc hệ thống (Architecture)](#-kiến-trúc-hệ-thống-architecture)
4. [Khởi chạy nhanh với Docker Compose](#-khởi-chạy-nhanh-với-docker-compose)
5. [Khởi chạy môi trường phát triển (Local Development)](#-khởi-chạy-môi-trường-phát-triển-local-development)
6. [Danh sách API Endpoints](#-danh-sách-api-endpoints)
7. [Máy trạng thái đơn hàng (Order State Machine)](#-máy-trạng-thái-đơn-hàng-order-state-machine)
8. [Cấu trúc thư mục dự án](#-cấu-trúc-thư-mục-dự-án)
9. [Kịch bản Demo (End-to-End Flow)](#-kịch-bản-demo-end-to-end-flow)
10. [Thành viên nhóm phát triển (Contributors)](#-thành-viên-nhóm-phát-triển-contributors)

---

## 📖 Giới thiệu dự án

Trong nhịp sống hiện đại, việc xếp hàng chờ đợi gọi món và thanh toán tiền mặt tại quán cà phê gây mất nhiều thời gian cho khách hàng và tăng tải vận hành cho nhân viên. **BrewLite** được thiết kế nhằm giải quyết bài toán này với các tính năng cốt lõi:
- **Thực đơn trực quan**: Xem danh mục sản phẩm, tùy biến size (S, M, L) và toppings.
- **Thanh toán không tiền mặt an toàn**: Tích hợp thanh toán qua Ví điện tử (WALLET) và Thẻ (CARD) với cơ chế chống giao dịch trùng lặp (**Idempotency Key**).
- **Xác thực bảo mật**: Quản lý phiên làm việc bằng JSON Web Token (JWT) qua Passport.
- **Cơ chế dữ liệu nhất quán**: Hệ thống sử dụng khóa định danh BigInt, ORM Prisma và ràng buộc giao dịch cơ sở dữ liệu PostgreSQL.

---

## 🛠 Công nghệ sử dụng (Tech Stack)

| Tầng hệ thống | Công nghệ / Thư viện | Mô tả |
| :--- | :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router) | Framework React render phía server và client hiệu năng cao |
| | [React 19](https://react.dev/) | Thư viện UI hiện đại |
| | [Tailwind CSS 4](https://tailwindcss.com/) | Styling giao diện linh hoạt, responsive |
| | [Zustand](https://zustand-demo.pmnd.rs/) | Quản lý trạng thái giỏ hàng (Cart) và phiên đăng nhập (Auth) |
| **Backend** | [NestJS 12](https://nestjs.com/) | Framework Node.js dạng module hướng đối tượng kiến trúc mở |
| | [TypeScript](https://www.typescriptlang.org/) | Ngôn ngữ tĩnh giúp hạn chế lỗi runtime |
| | [Prisma ORM 5](https://www.prisma.io/) | Tương tác CSDL PostgreSQL với type-safety |
| | [Passport & JWT](http://www.passportjs.org/) | Xác thực và phân quyền người dùng qua JSON Web Tokens |
| | [class-validator](https://github.com/typestack/class-validator) | Xác thực dữ liệu đầu vào (DTOs) |
| | [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Băm mật khẩu người dùng bảo mật |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) | Cơ sở dữ liệu quan hệ mạnh mẽ, hỗ trợ giao dịch ACID |
| **DevOps** | [Docker](https://www.docker.com/) & Docker Compose | Đóng gói và điều phối toàn bộ các dịch vụ |

---

## 🏛 Kiến trúc hệ thống (Architecture)

```mermaid
flowchart TD
    subgraph Client["Trình duyệt người dùng (Client)"]
        UI["Next.js Frontend (Port: 3000)\n- App Router\n- Zustand State\n- Tailwind CSS"]
    end

    subgraph Server["Hệ thống Backend (NestJS - Port: 3001)"]
        API["REST API Router (/api/...)"]
        Auth["Auth Module\n(JWT Guard + Passport)"]
        OrderMod["Orders Module"]
        PayMod["Payments Module\n(Idempotency Handler)"]
        ProdMod["Products & Toppings Module"]
        Prisma["Prisma ORM Client"]
    end

    subgraph DataStore["Cơ sở dữ liệu"]
        Postgres[("PostgreSQL 16 Database\n(Port: 5432)")]
    end

    UI -->|"HTTP / REST API (JWT Bearer)"| API
    API --> Auth
    API --> OrderMod
    API --> PayMod
    API --> ProdMod
    OrderMod --> Prisma
    PayMod --> Prisma
    ProdMod --> Prisma
    Prisma -->|"Prisma Engine / SQL Queries"| Postgres
```

---

## 🚀 Khởi chạy nhanh với Docker Compose

Chỉ với **1 câu lệnh duy nhất**, toàn bộ hệ sinh thái (Database, Backend, Frontend) sẽ được khởi chạy tự động:

```bash
docker compose up --build
```

### Quá trình khởi động gồm:
1. **Dịch vụ `db`**: Khởi chạy PostgreSQL 16 Alpine, cấu hình volume lưu trữ bền vững `pgdata` và kiểm tra sức khỏe (`healthcheck`).
2. **Dịch vụ `backend`**: Chờ database sẵn sàng -> chạy migrations (`prisma migrate deploy`) -> khởi chạy máy chủ NestJS tại cổng `3001`.
3. **Dịch vụ `frontend`**: Build mã nguồn Next.js đa tầng (multi-stage) -> phục vụ ứng dụng tại cổng `3000`.

### Truy cập các dịch vụ:
- 🌐 **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
- 🔌 **Backend REST API**: [http://localhost:3001](http://localhost:3001)
- 🗄️ **PostgreSQL Port**: `localhost:5432`

### Dừng hệ thống:
```bash
docker compose down
```
*(Thêm cờ `-v` nếu bạn muốn dọn sạch dữ liệu database volume: `docker compose down -v`)*

---

## 💻 Khởi chạy môi trường phát triển (Local Development)

### Yêu cầu tiên quyết:
- **Node.js**: >= 20.x
- **npm**: >= 10.x
- **PostgreSQL**: Cài đặt cục bộ hoặc sử dụng Docker container cho CSDL.

### 1. Chuẩn bị biến môi trường
Tạo file `.env` tại thư mục gốc từ mẫu `.env.example`:
```bash
cp .env.example .env
```

Nội dung cấu hình tiêu chuẩn:
```env
# Database URL
DATABASE_URL="postgresql://brewlite:brewlite123@localhost:5432/brewlite?schema=public"

# Auth Secret
JWT_SECRET="brewlite-super-secret-key-change-in-production"

# Ports
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. Chạy Backend (NestJS)
```bash
cd backend
npm install

# Khởi tạo schema và migrate cơ sở dữ liệu
npx prisma generate
npx prisma migrate dev --name init

# Khởi chạy chế độ Watch (Development)
npm run start:dev
```
Backend sẽ lắng nghe tại: `http://localhost:3001`

### 3. Chạy Frontend (Next.js)
Mở một cửa sổ terminal mới:
```bash
cd frontend
npm install

# Khởi chạy giao diện phát triển
npm run dev
```
Frontend sẽ lắng nghe tại: `http://localhost:3000`

### 4. Các lệnh quản lý & Cập nhật Cơ sở dữ liệu (Database Management)

Dưới đây là các câu lệnh hữu ích khi làm việc với Database (chạy trong thư mục `backend`):

| Mục đích | Câu lệnh | Khi nào sử dụng? |
| :--- | :--- | :--- |
| **Đồng bộ bảng mới** | `npx prisma db push` | Khi chỉnh sửa `prisma/schema.prisma` (thêm cột, thêm bảng, đổi kiểu). |
| **Nạp dữ liệu mẫu** | `node prisma/seed.js` | Tạo sẵn 6 món cà phê, 5 loại topping và tài khoản test (`customer`, `barista`). |
| **Xóa sạch & làm mới CSDL** | `npx prisma db push --force-reset`<br>`node prisma/seed.js` | Khi muốn xóa toàn bộ đơn hàng test và đưa CSDL về trạng thái sạch ban đầu. |
| **Xem & chỉnh sửa dữ liệu (UI)** | `npx prisma studio` | Mở giao diện Web quản trị dữ liệu trực quan tại [http://localhost:5555](http://localhost:5555). |

---

## 📡 Danh sách API Endpoints

Tất cả các route của ứng dụng đều sử dụng tiền tố chuẩn `/api/` (hoặc `/users`).

### 1. Xác thực & Tài khoản (`/api/auth`)
| Phương thức | Đường dẫn | Xác thực | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Không | Đăng ký tài khoản người dùng mới (`email`, `password`) |
| `POST` | `/api/auth/login` | Không | Đăng nhập hệ thống, trả về JWT access token |
| `GET` | `/api/auth/me` | Bearer Token | Kiểm tra thông tin người dùng đang đăng nhập |

### 2. Thực đơn & Sản phẩm (`/api/products`)
| Phương thức | Đường dẫn | Xác thực | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/products` | Không | Lấy danh sách toàn bộ món nước trong thực đơn |
| `GET` | `/api/products/:id` | Không | Tra cứu thông tin chi tiết một sản phẩm theo ID |
| `POST` | `/api/products` | Yêu cầu | Thêm món mới vào thực đơn |
| `PATCH` | `/api/products/:id` | Yêu cầu | Cập nhật thông tin/giá/trạng thái sản phẩm |
| `DELETE` | `/api/products/:id` | Yêu cầu | Xóa sản phẩm khỏi menu |

### 3. Toppings (`/api/toppings`)
| Phương thức | Đường dẫn | Xác thực | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/toppings` | Không | Lấy danh sách topping đính kèm |
| `GET` | `/api/toppings/:id` | Không | Lấy chi tiết topping theo ID |
| `POST` | `/api/toppings` | Yêu cầu | Tạo topping mới |
| `PATCH` | `/api/toppings/:id` | Yêu cầu | Chỉnh sửa thông tin topping |
| `DELETE` | `/api/toppings/:id` | Yêu cầu | Xóa topping |

### 4. Đơn hàng (`/api/orders`)
| Phương thức | Đường dẫn | Xác thực | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/orders` | Bearer Token | Khởi tạo đơn hàng mới từ giỏ hàng (Khởi tạo ở trạng thái `PENDING`) |

### 5. Thanh toán (`/api/payments`)
| Phương thức | Đường dẫn | Xác thực | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/payments` | Bearer Token | Thực hiện thanh toán đơn hàng (sử dụng `idempotencyKey`) |
| `GET` | `/api/payments/order/:orderId` | Bearer Token | Tra cứu lịch sử và trạng thái thanh toán của đơn hàng |

### 6. Quản lý người dùng (`/users`)
| Phương thức | Đường dẫn | Xác thực | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/users` | Admin | Lấy danh sách tài khoản (hỗ trợ phân trang) |
| `GET` | `/users/:id` | Tùy quyền | Lấy chi tiết tài khoản theo ID |
| `PATCH` | `/users/:id` | Tùy quyền | Cập nhật thông tin người dùng |
| `DELETE` | `/users/:id` | Admin | Xóa tài khoản người dùng |

---

## 🔄 Máy trạng thái đơn hàng (Order State Machine)

Trạng thái của mỗi đơn hàng tuân theo quy trình nghiêm ngặt, đảm bảo tính toàn vẹn dữ liệu:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Khách tạo đơn hàng (POST /api/orders)

    PENDING --> PAID: Thanh toán thành công (POST /api/payments)
    PENDING --> PAYMENT_FAILED: Thanh toán lỗi / Hết hạn
    PENDING --> CANCELLED: Khách hủy đơn

    PAID --> PREPARING: Barista xác nhận & bắt đầu pha chế
    PREPARING --> READY: Đồ uống hoàn tất tại quầy
    READY --> COMPLETED: Khách nhận món thành công

    PAYMENT_FAILED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

### Diễn giải các trạng thái:
- `PENDING`: Đơn hàng vừa được tạo từ giỏ hàng, chờ khách hàng hoàn tất thanh toán.
- `PAID`: Đơn hàng đã nhận tiền thành công qua giao dịch `Payment` được bảo vệ bởi khóa định danh chống trùng lặp.
- `PREPARING`: Nhân viên quầy bar tiếp nhận và thực hiện pha chế đồ uống.
- `READY`: Đồ uống đã sẵn sàng tại quầy nhận món, thông báo tới khách hàng.
- `COMPLETED`: Khách hàng đã nhận đồ uống và đơn hàng kết thúc chu trình.
- `PAYMENT_FAILED`: Giao dịch bị từ chối do lỗi thẻ hoặc ví không hợp lệ.
- `CANCELLED`: Đơn hàng bị hủy hợp lệ trước khi tiến hành pha chế.

---

## 📂 Cấu trúc thư mục dự án

```
BrewLite_Nhom/
├── .env.example                # File mẫu các biến môi trường cấu hình
├── docker-compose.yml          # Cấu hình khởi chạy toàn bộ dịch vụ với Docker
├── README.md                   # Tài liệu hướng dẫn sử dụng và triển khai
│
├── backend/                    # Ứng dụng Backend NestJS
│   ├── Dockerfile              # Multi-stage Docker build cho Backend
│   ├── .dockerignore           # Tập tin bỏ qua khi Docker build
│   ├── package.json            # Thư viện và kịch bản thực thi Backend
│   ├── prisma/
│   │   └── schema.prisma       # Mô hình cơ sở dữ liệu (PostgreSQL Schema)
│   └── src/
│       ├── auth/               # Module xác thực JWT, Password Hashing & Guard
│       ├── orders/             # Module xử lý đặt món và tính toán giá
│       ├── payments/           # Module thanh toán và cơ chế Idempotency
│       ├── products/           # Module thực đơn, danh mục cà phê
│       ├── toppings/           # Module quản lý toppings kèm theo
│       ├── users/              # Module tài khoản và phân quyền
│       ├── prisma/             # Service kết nối Prisma Database Client
│       ├── app.module.ts       # Module gốc kết nối toàn bộ hệ thống
│       └── main.ts             # Điểm khởi chạy NestJS, tiền tố /api, BigInt serializer
│
└── frontend/                   # Ứng dụng Frontend Next.js
    ├── Dockerfile              # Multi-stage Docker build cho Frontend
    ├── .dockerignore           # Tập tin bỏ qua khi Docker build
    ├── package.json            # Thư viện và kịch bản thực thi Frontend
    ├── app/                    # Next.js App Router (Layout, Trang menu, Đơn hàng, v.v.)
    └── store/                  # Quản lý State toàn cục bằng Zustand (cartStore, authStore)
```

---

## 🧪 Nghiệp vụ Backend Nâng cao (Task 10) & Kiểm thử tự động

Hệ thống đã triển khai đầy đủ 4 tiêu chí cốt lõi của Task 10 theo đúng đặc tả:

1. **Order State Machine (Máy trạng thái đơn hàng)**:
   - Quản lý quá trình chuyển trạng thái qua `OrdersService.assertTransition()`.
   - Luồng chính: `PENDING` ➔ `PAID` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`.
   - Các nhánh ngoại lệ: `PAYMENT_FAILED` (cho phép thử lại `PENDING`), `CANCELLED` (hủy đơn và hoàn tồn kho).
   - Tự động ném `BadRequestException` khi phát hiện các bước nhảy cóc không hợp lệ (ví dụ: `PENDING` nhảy thẳng lên `COMPLETED` hay `CANCELLED` ➔ `PAID`).

2. **Thanh toán Idempotent (Idempotency Key)**:
   - Endpoint `POST /api/payments` nhận `idempotencyKey` duy nhất.
   - Khi client gửi lại cùng một key (do retry mạng hoặc nhấn 2 lần), backend tự động nhận diện bản ghi thanh toán đã tồn tại và trả về kết quả trước đó với cờ `idempotent: true`, tuyệt đối không trừ tiền 2 lần hoặc tạo trùng giao dịch.

3. **Kiểm soát tồn kho đồng thời (Concurrency Inventory Control & Optimistic Locking)**:
   - Sử dụng Prisma Transaction kết hợp **Optimistic Locking** qua trường `version` và điều kiện `stock: { gte: item.qty }`.
   - Khi nhiều khách đặt mua sản phẩm cùng lúc, giao dịch sau có `version` không khớp sẽ bị chặn và ném `ConflictException` (409) hoặc `BadRequestException` (khi hết tồn kho), đảm bảo không bao giờ bán vượt quá số lượng hàng có sẵn.

4. **Giảm giá theo điểm tích lũy (Loyalty Points Discount) & Tích điểm thưởng**:
   - Tự động áp dụng giảm giá theo hạng điểm tích lũy (`loyaltyPoints`) của khách hàng:
     - **Hạng Đồng** (< 20 điểm): 0% giảm giá
     - **Hạng Bạc** (20 - 49 điểm): Tự động giảm **5%**
     - **Hạng Vàng** (50 - 99 điểm): Tự động giảm **10%**
     - **Hạng Kim Cương** (>= 100 điểm): Tự động giảm **15%**
   - Điểm tích lũy không bị trừ khi giảm giá, giúp khách hàng duy trì và thăng hạng.
   - Khi đơn chuyển sang `PAID`, hệ thống tự động tích lũy thêm điểm thưởng theo tỷ lệ 1 điểm / 10.000đ vào tài khoản khách hàng.

### 🏃 Chạy kiểm thử tự động (Unit Tests)
Toàn bộ 28 tests trong hệ thống (bao gồm 14 tests dành riêng cho Task 10) đều đã sẵn sàng:
```bash
cd backend
npm test
```
Hoặc chỉ chạy riêng bộ test kiểm chứng Task 10:
```bash
npm test -- src/orders/orders.task10.spec.ts
```

---

## ☕ Phân hệ Barista / Quầy Pha Chế (Tính năng mở rộng ngoài MVP)

- **Mục đích**: Nhân viên quầy tiếp nhận đơn đã thanh toán và cập nhật tiến độ pha chế theo thời gian thực.
- **Đường dẫn giao diện**: [http://localhost:3000/barista](http://localhost:3000/barista)
- **Tài khoản kiểm thử có sẵn (Seeded Data)**:
  - **Tài khoản Barista**: `barista@brewlite.com` / `barista123`
  - **Tài khoản Khách hàng**: `customer@brewlite.com` / `customer123`

---

## 🎬 Kịch bản Demo (End-to-End Flow)

1. **Khởi chạy ứng dụng**:
   Chạy lệnh `docker compose up --build` và chờ các dịch vụ hoạt động. Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).
2. **Chọn món & Giỏ hàng (Khách vãng lai)**:
   Khách hàng có thể thoải mái xem menu, tùy chọn size/toppings và thêm vào giỏ hàng mà **không cần đăng nhập trước**.
3. **Thanh toán & Đăng nhập**:
   Tại trang Giỏ hàng / Checkout, khi bấm "Thanh toán", nếu chưa đăng nhập hệ thống sẽ yêu cầu đăng nhập. Giỏ hàng được giữ nguyên sau khi đăng nhập thành công.
4. **Ưu đãi thành viên theo loyaltyPoints & Thanh toán**:
   Tại màn hình Checkout, hệ thống tự động nhận diện hạng thành viên và số điểm tích lũy (`loyaltyPoints`) của khách hàng để áp dụng chiết khấu tự động (ví dụ tài khoản `customer@brewlite.com` có 50 điểm -> Hạng Vàng được giảm ngay 10%). Chọn phương thức Ví điện tử (VietQR / MoMo) và nhấn Thanh toán. Hệ thống sinh `idempotencyKey` và chuyển đơn sang `PAID`.
5. **Xác nhận & Điểm thưởng**:
   Chuyển hướng đến trang xác nhận `/orders/:id`, hiển thị mã đơn, trạng thái và điểm thưởng vừa được tích lũy.
6. **Barista nhận đơn & Pha chế**:
   Đăng nhập tài khoản `barista@brewlite.com` tại `/barista`, nhận đơn (`PAID` ➔ `PREPARING`), báo hoàn thành (`PREPARING` ➔ `READY`), và giao khách (`READY` ➔ `COMPLETED`).

---

## 👥 Thành viên nhóm phát triển (Contributors)

| STT | Họ và tên | MSSV | Vai trò chính |
| :---: | :--- | :---: | :--- |
| 1 | *Thành viên 1* | *MSSV 1* | Backend Development (NestJS, Prisma, Docker) |
| 2 | *Thành viên 2* | *MSSV 2* | Frontend Development (Next.js, UI/UX, Zustand) |
| 3 | *Thành viên 3* | *MSSV 3* | Database Design, API Integration & Testing |

---

*Dự án được xây dựng trong khuôn khổ môn học Công nghệ phần mềm.*

