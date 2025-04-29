// D:\project_hust\Web\chat-and-video-call\client\src\untils\uploadthing.js (CORRECT Frontend file)
"use client"; // Đánh dấu đây là component client-side

import { generateUploadButton } from "@uploadthing/react"; // Import hàm từ thư viện frontend

// Đây là URL endpoint của backend Uploadthing của bạn.
// Frontend sẽ gửi yêu cầu upload đến URL này.
// Đảm bảo URL này khớp với URL mà server bạn lắng nghe cho Uploadthing.
const backendUrl = "http://localhost:8080/api/uploadthing"; // URL từ cấu hình backend

export const UploadButton = generateUploadButton({
  url: backendUrl,
});

// Bạn có thể định nghĩa thêm các component khác nếu cần, ví dụ UploadDropzone
// export const UploadDropzone = generateUploadDropzone({
//   url: backendUrl,
// });