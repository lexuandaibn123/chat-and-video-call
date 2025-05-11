// src/utils/helpers.js (giả định)
export const formatTime = (isoTime) => {
    const date = new Date(isoTime);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
    // Nếu thời gian cách hiện tại dưới 1 ngày, hiển thị giờ và khoảng thời gian (sáng/chiều)
    if (diffInMinutes < 24 * 60) {
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'ch' : 'sa';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    }
  
    // Nếu lâu hơn, hiển thị ngày tháng (có thể tùy chỉnh thêm)
    return date.toLocaleDateString('vi-VN');
  };