import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  // Tạo mảng dữ liệu mẫu (mock data)
  private readonly products = [
    {
      id: 1,
      name: 'Cà phê Đen Đá',
      price: 25000,
      imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMXcuBS3gatXstwVQE3pJudXTG80IQ4P4DgULo40q8NOt5OdrDY5T_k6E&s=10',
      stock: 100, // Thêm stock để chuẩn bị cho Task 10 sau này
    },
    {
      id: 2,
      name: 'Cà phê Sữa Đá',
      price: 29000,
      imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2NFRBpkoPpcziZwb26YhIC3NX0CujVWRrZw0arEfUsQ&s=10',
      stock: 50,
    },
    {
      id: 3,
      name: 'Bạc Xỉu',
      price: 35000,
      imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE7ZcYHvsSpe1IoWFZdAseEMBNuVCYG5zoekLAWqdmIQ&s=10',
      stock: 30,
    },
    {
      id: 4,
      name: 'Cacao',
      price: 32000,
      imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXguFi_ExSWzZQ7shW_Rbw6phRyHuqyWofxhjvx1x4XU1rCr2bGL3T8kw&s=10',
      stock: 30,
    },
    {
      id: 5,
      name: 'Matcha Latte',
      price: 40000,
      imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTljTPa31JFIpr0DaMN_aM64qSiPTfgqn6T_Zk7SnSzHw&s=10',
      stock: 40,
    },
    {
      id: 6,
      name: 'Soda nho',
      price: 23000,
      imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTv6LlslvqQBkBD94Bqa4v7SP1cFpeJWbqDd80Nd4otdA&s=10',
      stock: 30,
    },
  ];

  // Hàm trả về toàn bộ danh sách sản phẩm
  findAll() {
    return this.products; 
  }

  // Hàm trả về chi tiết 1 sản phẩm (cho API GET /products/:id)
  findOne(id: number) {
    return this.products.find((product) => product.id === id);
  }
}
