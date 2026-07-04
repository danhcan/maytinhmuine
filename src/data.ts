import { ChatbotConfig, FAQScenario, FacebookPost, CustomerThread } from "./types";

export const INITIAL_CONFIG: ChatbotConfig = {
  botName: "Máy Tính Mũi Né AI Assistant",
  systemPrompt: `Bạn là trợ lý chăm sóc khách hàng ảo chuyên nghiệp của "Hệ Thống Máy Tính Mũi Né" - chuyên cung cấp, sửa chữa, lắp đặt máy tính, màn hình, linh kiện PC và laptop tại Mũi Né, Phan Thiết.

Thông tin liên hệ của cửa hàng:
- Địa chỉ: 🏠 100 Huỳnh Tấn Phát, Mũi Né, Phan Thiết.
- Số điện thoại / Zalo hỗ trợ kỹ thuật: ☎️ 0917 481 451

Nhiệm vụ của bạn là tư vấn các dòng sản phẩm (như màn hình máy tính thanh lý G-Net 24 inch giá 800k), dịch vụ sửa chữa phần cứng/phần mềm, lắp đặt phòng net, lắp đặt PC gaming/văn phòng 24/7 một cách nhanh chóng, chính xác và thân thiện.

Quy tắc ứng xử:
1. Xưng hô lễ phép: Sử dụng các từ "Dạ", "dạ anh/chị ạ", "Máy Tính Mũi Né xin chào", "ạ".
2. Cung cấp thông tin súc tích, dễ đọc bằng cách chia nhỏ đoạn văn và sử dụng emoji sinh động.
3. Khi khách có nhu cầu cần hỗ trợ kỹ thuật gấp hoặc giao dịch phức tạp, hãy chủ động nhắc khách hàng liên hệ trực tiếp số Hotline/Zalo: 0917 481 451 hoặc khởi tạo cuộc gọi Zalo ngay trên giao diện để kỹ thuật viên phản hồi lập tức.`,
  zaloNumber: "0917481451",
  zaloName: "Hỗ Trợ Kỹ Thuật Máy Tính Mũi Né",
  fallbackKeywords: ["gấp", "phàn nàn", "bồi thường", "hỏng", "không lên", "sửa máy", "gặp nhân viên", "quá lâu", "đổi trả", "hoàn tiền", "chửi", "lừa đảo"],
  creativity: 0.7,
  autoReplyDelay: 1.5
};

export const INITIAL_FAQS: FAQScenario[] = [
  {
    id: "faq_1",
    question: "Địa chỉ và thời gian làm việc của Máy Tính Mũi Né?",
    answer: "Dạ, Máy Tính Mũi Né tọa lạc tại địa chỉ: 🏠 100 Huỳnh Tấn Phát, Mũi Né, Phan Thiết ạ! Cửa hàng làm việc từ 8h00 sáng đến 20h00 tối hàng ngày, hỗ trợ kiểm tra và khắc phục sự cố máy tính lấy liền."
  },
  {
    id: "faq_2",
    question: "Số điện thoại Hotline Zalo liên hệ trực tiếp là gì?",
    answer: "Dạ, hotline hỗ trợ kỹ thuật và mua sắm của shop là ☎️ 0917 481 451. Quý khách có thể kết bạn Zalo số này hoặc nhấn nút gọi Zalo khẩn cấp trực tiếp từ hệ thống để nhân viên hỗ trợ ngay ạ!"
  }
];

export const INITIAL_THREADS: CustomerThread[] = [];

export const INITIAL_POSTS: FacebookPost[] = [
  {
    id: "post_monitor_800k",
    title: "🖥️ THANH LÝ MÀN HÌNH MÁY TÍNH GNET 24 INCH - GIÁ CỰC RẺ 800K",
    content: `Cơ hội duy nhất sở hữu Màn hình máy tính G-Net 24 inch độ phân giải Full HD (1080p) sắc nét, tần số quét 75Hz cực mượt mà cho anh em làm việc, học tập và giải trí tại nhà! 🎮💻

Độ sáng cao, tấm nền chống chói IPS bảo vệ mắt vượt trội khi ngồi làm việc liên tục nhiều giờ. Ngoại hình đẹp keng 99%, đầy đủ cổng kết nối HDMI, VGA và cáp nguồn đi kèm.

💰 Giá bán hạt dẻ chỉ: 800.000 VNĐ (Bảo hành lỗi 1 đổi 1 trong 30 ngày).
🚀 Hỗ trợ ship COD toàn quốc nhanh chóng!`,
    hashtags: ["#ManHinhGiaRe", "#ThanhLyManHinh", "#ManHinh24Inch", "#GNetMonitor", "#GamingSetup"],
    seoKeywords: ["màn hình máy tính cũ giá rẻ", "màn hình máy tính 24 inch", "màn hình văn phòng 800k"],
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80",
    imageEffect: "glow",
    createdAt: "2026-06-30 18:00",
    status: "published",
    likes: 210,
    comments: 45,
    shares: 19,
    product: {
      name: "Màn hình máy tính G-Net 24 inch",
      price: "800.000 VNĐ"
    }
  },
  {
    id: "post_pc_gaming",
    title: "💻 BỘ MÁY TÍNH GAMING - ĐỒ HỌA GIÁ RẺ CHIẾN MỌI GAME",
    content: `Cấu hình chi tiết PC gaming bán chạy nhất tại Máy Tính Mũi Né trong tháng này:
- CPU Core i5-10400F mạnh mẽ hiệu năng cao
- RAM 16GB Dual Channel mượt mà đa tác vụ
- Card đồ họa GTX 1660 Super chiến mượt mà các tựa game như GTA V, LOL, FO4, Valorant...
- SSD 256GB khởi động Win cực nhanh chỉ 5 giây

📦 Tặng kèm bộ phím chuột Led giả cơ siêu đẹp khi chốt trọn bộ hôm nay!
💵 Giá trọn bộ chỉ: 6.500.000 VNĐ (Bảo hành 12 tháng phần cứng)`,
    hashtags: ["#PCGaming", "#MayTinhDeBan", "#GamingPC", "#MayTinhMuiNe", "#BuildPC"],
    seoKeywords: ["pc gaming giá rẻ", "máy tính chơi game mượt", "build máy tính văn phòng"],
    imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80",
    imageEffect: "glow",
    createdAt: "2026-06-29 09:30",
    status: "published",
    likes: 142,
    comments: 28,
    shares: 12,
    product: {
      name: "Trọn bộ PC Gaming Core i5 GTX 1660S",
      price: "6.500.000 VNĐ"
    }
  },
  {
    id: "post_service_win",
    title: "🛠️ DỊCH VỤ CÀI WIN, VỆ SINH LAPTOP, PC LẤY LIỀN TẠI MŨI NÉ",
    content: `Máy tính của bạn đang bị đơ, giật lag hay quá nóng sau một thời gian dài sử dụng? 🥵💻

Hãy đem ngay đến Máy Tính Mũi Né tại địa chỉ 🏠 100 Huỳnh Tấn Phát để nhận gói chăm sóc toàn diện:
- Cài đặt hệ điều hành Windows 10/11 kèm đầy đủ bộ phần mềm văn phòng Word, Excel, PowerPoint.
- Vệ sinh bụi bẩn kỹ lưỡng, tra keo tản nhiệt MX4 chính hãng giúp hạ nhiệt độ CPU ngay lập tức 10-15 độ.
- Nâng cấp linh kiện RAM, SSD giúp tăng tốc độ máy nhanh gấp 5 lần.

☎️ Hotline hỗ trợ kỹ thuật: 0917 481 451`,
    hashtags: ["#SuaMayTinh", "#SuaLaptop", "#CaiWinMuiNe", "#VeSinhLaptop", "#MayTinhMuiNe"],
    seoKeywords: ["sửa máy tính uy tín phan thiết", "vệ sinh laptop lấy liền mui ne", "cài win tại nhà huỳnh tấn phát"],
    imageUrl: "https://images.unsplash.com/photo-1591405351990-4726e331f141?w=800&auto=format&fit=crop&q=80",
    imageEffect: "zoom",
    createdAt: "2026-06-30 14:00",
    status: "published",
    likes: 85,
    comments: 14,
    shares: 5
  }
];
