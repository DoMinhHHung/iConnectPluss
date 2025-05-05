# iConnect

iConnect là ứng dụng kết nối người dùng với giao diện thân thiện và dễ sử dụng.

## Cài đặt

### Yêu cầu hệ thống

- Node.js (v14.0.0 trở lên)
- npm hoặc yarn

### Backend

```bash
# Di chuyển vào thư mục server
cd server

# Cài đặt các dependency
npm install

# Chạy server phát triển
npm run dev
```

### Frontend

```bash
# Di chuyển vào thư mục app
cd app

# Cài đặt các dependency
npm install

# Chạy ứng dụng phát triển
npm run dev
```

## Cấu trúc thư mục

```
app/
  ├── src/
  │   ├── api/             # Các hàm gọi API
  │   ├── asset/           # Hình ảnh, fonts, và các tài nguyên khác
  │   ├── components/      # Các component tái sử dụng
  │   ├── constants/       # Các hằng số và cấu hình
  │   ├── pages/           # Các trang của ứng dụng
  │   ├── redux/           # Redux store, reducers và actions
  │   ├── scss/            # Các file SCSS
  │   └── types/           # Định nghĩa kiểu TypeScript
  ├── public/              # Các file tĩnh
  └── package.json         # Cấu hình NPM
```

## Tính năng

- Đăng nhập/Đăng ký
- Quản lý hồ sơ người dùng
- Đặt lại mật khẩu
- Xác thực người dùng với JWT
- Giao diện thân thiện với người dùng
- Responsive trên các thiết bị

## Công nghệ sử dụng

- React
- TypeScript
- Redux Toolkit
- Axios
- Bootstrap
- SCSS
- React Router
- React Toastify
