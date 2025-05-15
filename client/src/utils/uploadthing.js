// src\untils\uploadthing.js 
"use client"; 

import { generateUploadButton } from "@uploadthing/react"; // Import hàm từ thư viện frontend

// Đây là URL endpoint của backend Uploadthing của bạn.
// Frontend sẽ gửi yêu cầu upload đến URL này.
// Đảm bảo URL này khớp với URL mà server bạn lắng nghe cho Uploadthing.
const backendUrl = `${import.meta.env.VITE_SERVER_URL}/api/uploadthing`;

export const UploadButton = generateUploadButton({
  url: backendUrl,
});

// Bạn có thể định nghĩa thêm các component khác nếu cần, ví dụ UploadDropzone
// export const UploadDropzone = generateUploadDropzone({
//   url: backendUrl,
// });