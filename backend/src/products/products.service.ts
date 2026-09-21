import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  // Tạo mảng dữ liệu mẫu (mock data)
  private readonly products = [
    {
      id: 1,
      name: 'Cà phê Đen Đá',
      price: 25000,
      imageUrl: 'https://via.placeholder.com/150?text=Den+Da',
      stock: 100, // Thêm stock để chuẩn bị cho Task 10 sau này
    },
    {
      id: 2,
      name: 'Cà phê Sữa Đá',
      price: 29000,
      imageUrl: 'https://via.placeholder.com/150?text=Sua+Da',
      stock: 50,
    },
    {
      id: 3,
      name: 'Bạc Xỉu',
      price: 35000,
      imageUrl: 'https://via.placeholder.com/150?text=Bac+Xiu',
      stock: 30,
    },
  ];

  // Hàm trả về toàn bộ danh sách sản phẩm
  findAll() {
    return this.products;
  }

  // Hàm trả về chi tiết 1 sản phẩm (cho API GET /products/:id)
  findOne(id: number) {
    return this.products.find(product => product.id === id);
  }
}