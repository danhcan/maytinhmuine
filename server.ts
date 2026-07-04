import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
// tunnelmole imported dynamically in dev mode only

dotenv.config();

let activeTunnelUrl: string | null = null;

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY is missing. AI features will fallback gracefully or return helpful instructions.");
}

app.use(express.json({ limit: '10mb' }));

// API routes FIRST
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, systemPrompt, image } = req.body;
    
    if (!ai) {
      return res.status(500).json({ error: "Chưa cấu hình GEMINI_API_KEY ở phần cài đặt Secrets." });
    }

    const formattedContents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        formattedContents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      });
    }

    const parts: any[] = [];
    if (image && image.data && image.mimeType) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }
    parts.push({ text: message });
    formattedContents.push({
      role: 'user',
      parts
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt || "Bạn là một trợ lý chăm sóc khách hàng chuyên nghiệp trên Facebook Fanpage.",
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "Lỗi xử lý phản hồi từ AI" });
  }
});

app.post("/api/generate-post", async (req, res) => {
  try {
    const { prompt, tone, keywords, optimizeSEO } = req.body;

    if (!ai) {
      return res.status(500).json({ error: "Chưa cấu hình GEMINI_API_KEY ở phần cài đặt Secrets." });
    }

    const systemInstruction = `Bạn là một chuyên gia Content Marketing và SEO chuyên nghiệp tại Việt Nam.
Hãy viết một bài đăng Facebook Fanpage thu hút, tối ưu từ khóa SEO tự động dựa trên yêu cầu của người dùng.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Hãy tạo bài viết về chủ đề: "${prompt}". 
Tông giọng mong muốn: "${tone || 'Chuyên nghiệp'}".
Các từ khóa phụ cần đưa vào nếu có: "${keywords || ''}".
Tối ưu hóa SEO: ${optimizeSEO ? 'Có' : 'Không'}.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Tiêu đề bài viết ngắn gọn, giật gân, có chứa emoji",
            },
            content: {
              type: Type.STRING,
              description: "Nội dung bài viết chi tiết, cuốn hút, chia đoạn rõ ràng, sử dụng các ký tự đặc biệt hoặc emoji để làm nổi bật thông tin",
            },
            hashtags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "Danh sách các hashtag liên quan",
            },
            seoKeywords: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "Các từ khóa tối ưu SEO",
            },
            seoAnalysis: {
              type: Type.STRING,
              description: "Giải thích ngắn gọn lý do tại sao bài viết này tối ưu SEO và thu hút",
            },
          },
          required: ["title", "content", "hashtags", "seoKeywords", "seoAnalysis"],
        },
        temperature: 0.8,
      }
    });

    const responseText = response.text || "{}";
    let result;
    try {
      result = JSON.parse(responseText.trim());
    } catch (e) {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanJson);
    }

    res.json(result);
  } catch (error: any) {
    console.error("Generate post error:", error);
    res.status(500).json({ error: error.message || "Lỗi tạo bài viết từ AI" });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!ai) {
      return res.status(500).json({ error: "Chưa cấu hình GEMINI_API_KEY ở phần cài đặt Secrets." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Không thể tạo file âm thanh từ mô hình TTS." });
    }
  } catch (error: any) {
    console.error("TTS error:", error);
    res.status(500).json({ error: error.message || "Lỗi tạo âm thanh từ AI TTS" });
  }
});

// --- AI CUSTOM CONFIG & SCENARIOS STATE ---
interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  voice: string;
  isCustom?: boolean;
}

const DEFAULT_SCENARIOS: ScenarioPreset[] = [
  {
    id: "sales",
    name: "Tư vấn Bán hàng & Build PC",
    description: "Tập trung tư vấn linh kiện, phụ kiện, cấu hình máy tính gaming/văn phòng và chốt đơn nhanh.",
    systemPrompt: `Bạn là trợ lý ảo chăm sóc khách hàng chuyên nghiệp của "Hệ Thống Máy Tính Mũi Né" tại Phan Thiết.
Nhiệm vụ chính: Tư vấn bán hàng, đề xuất cấu hình PC (Gaming, Văn phòng, Đồ họa) và giới thiệu linh kiện, màn hình máy tính (ví dụ: màn hình G-Net 24" thanh lý giá siêu rẻ chỉ 800k).
Xưng hô: Thân thiện, lễ phép (Dạ, em xin chào anh/chị ạ). Luôn dùng emoji sinh động và ngắt dòng rõ ràng để khách dễ đọc.
Chốt sale: Khi khách quan tâm, khéo léo mời khách cung cấp số điện thoại hoặc liên hệ Hotline/Zalo: 0917 481 451 để bên em giao hàng tận nơi.`,
    temperature: 0.8,
    voice: "Zephyr"
  },
  {
    id: "tech_support",
    name: "Hỗ trợ Kỹ thuật & Sửa chữa",
    description: "Giải đáp lỗi phần mềm/phần cứng, chẩn đoán lỗi máy tính và hướng dẫn sửa chữa cơ bản.",
    systemPrompt: `Bạn là chuyên viên kỹ thuật phần cứng của "Hệ Thống Máy Tính Mũi Né".
Nhiệm vụ chính: Chẩn đoán lỗi máy tính (mất nguồn, màn hình xanh, không nhận ổ cứng, máy chạy chậm), hướng dẫn khắc phục cơ bản.
Xưng hô: Lịch sự, chuyên nghiệp, tạo cảm giác tin cậy.
Lưu ý quan trọng: Với lỗi phần cứng nặng hoặc cần can thiệp kỹ thuật trực tiếp, hướng dẫn khách mang máy qua 100 Huỳnh Tấn Phát, Mũi Né hoặc gọi ngay Hotline/Zalo kỹ thuật 0917 481 451 để được hỗ trợ kiểm tra miễn phí.`,
    temperature: 0.3,
    voice: "Kore"
  },
  {
    id: "cyber_net",
    name: "Lắp đặt Phòng Game / Phòng Net",
    description: "Tư vấn thiết kế, thi công trọn gói cyber game, máy chủ bootrom và lập dự toán ngân sách.",
    systemPrompt: `Bạn là chuyên gia tư vấn thiết kế và thi công lắp đặt phòng Net trọn gói của "Hệ Thống Máy Tính Mũi Né".
Nhiệm vụ chính: Tư vấn cấu hình máy trạm, máy chủ bootrom, bàn ghế game thủ, dự toán chi phí, giấy phép kinh doanh phòng game.
Xưng hô: Chuyên nghiệp, nhạy bén kinh doanh, tự tin.
Chốt đơn: Khuyến khích khách để lại số điện thoại hoặc liên hệ trực tiếp số Hotline/Zalo dự án: 0917 481 451 để nhận bảng dự toán chi tiết và các chương trình ưu đãi lắp đặt (tặng bảng hiệu, trang trí phòng net).`,
    temperature: 0.7,
    voice: "Charon"
  },
  {
    id: "warranty",
    name: "Chăm sóc khách hàng & Bảo hành",
    description: "Cung cấp giờ hoạt động, địa chỉ, chính sách đổi trả sản phẩm và bảo hành 1-đổi-1.",
    systemPrompt: `Bạn là nhân viên bộ phận Chăm sóc khách hàng & Bảo hành của "Hệ Thống Máy Tính Mũi Né".
Nhiệm vụ chính: Cung cấp thông tin giờ mở cửa (8h - 21h hàng ngày), địa chỉ (100 Huỳnh Tấn Phát, Mũi Né), chính sách bảo hành 1-đổi-1 cho linh kiện mới, thời gian nhận máy bảo hành.
Xưng hô: Ôn hòa, lắng nghe, chu đáo. Giải quyết khiếu nại hoặc hướng dẫn bảo hành một cách ân cần nhất.`,
    temperature: 0.5,
    voice: "Puck"
  }
];

let customScenarios: ScenarioPreset[] = [];
let activeScenarioId = "sales";

let chatbotConfig = {
  botName: "Máy Tính Mũi Né Assistant",
  systemPrompt: DEFAULT_SCENARIOS[0].systemPrompt,
  temperature: 0.8,
  botVoice: "Zephyr",
  autoReplyDelay: 2,
  zaloNumber: "0917 481 451",
  zaloName: "Hỗ Trợ Kỹ Thuật",
  fallbackKeywords: ["sửa chữa", "lỗi", "mất nguồn", "hỏng", "liên hệ"]
};

app.get("/api/chatbot/config", (req, res) => {
  res.json({
    config: chatbotConfig,
    activeScenarioId,
    scenarios: [...DEFAULT_SCENARIOS, ...customScenarios]
  });
});

app.post("/api/chatbot/config", (req, res) => {
  const { botName, systemPrompt, temperature, botVoice, autoReplyDelay, zaloNumber, zaloName, fallbackKeywords, activeScenarioId: newActiveId } = req.body;
  
  if (botName !== undefined) chatbotConfig.botName = botName;
  if (systemPrompt !== undefined) chatbotConfig.systemPrompt = systemPrompt;
  if (temperature !== undefined) chatbotConfig.temperature = Number(temperature);
  if (botVoice !== undefined) chatbotConfig.botVoice = botVoice;
  if (autoReplyDelay !== undefined) chatbotConfig.autoReplyDelay = Number(autoReplyDelay);
  if (zaloNumber !== undefined) chatbotConfig.zaloNumber = zaloNumber;
  if (zaloName !== undefined) chatbotConfig.zaloName = zaloName;
  if (fallbackKeywords !== undefined) chatbotConfig.fallbackKeywords = fallbackKeywords;
  
  if (newActiveId !== undefined) {
    activeScenarioId = newActiveId;
    const found = [...DEFAULT_SCENARIOS, ...customScenarios].find(s => s.id === newActiveId);
    if (found) {
      chatbotConfig.systemPrompt = found.systemPrompt;
      chatbotConfig.temperature = found.temperature;
      chatbotConfig.botVoice = found.voice;
    }
  }
  
  res.json({ success: true, config: chatbotConfig, activeScenarioId });
});

app.post("/api/chatbot/scenarios", (req, res) => {
  const { name, description, systemPrompt, temperature, voice } = req.body;
  if (!name || !systemPrompt) {
    return res.status(400).json({ error: "Thiếu trường tên hoặc kịch bản system instruction" });
  }
  const newPreset: ScenarioPreset = {
    id: `custom_${Date.now()}`,
    name,
    description: description || "Kịch bản tùy chỉnh do người dùng tạo.",
    systemPrompt,
    temperature: temperature !== undefined ? Number(temperature) : 0.7,
    voice: voice || "Kore",
    isCustom: true
  };
  customScenarios.push(newPreset);
  res.json({ success: true, preset: newPreset, scenarios: [...DEFAULT_SCENARIOS, ...customScenarios] });
});

app.delete("/api/chatbot/scenarios/:id", (req, res) => {
  const { id } = req.params;
  customScenarios = customScenarios.filter(s => s.id !== id);
  if (activeScenarioId === id) {
    activeScenarioId = "sales";
    chatbotConfig.systemPrompt = DEFAULT_SCENARIOS[0].systemPrompt;
    chatbotConfig.temperature = DEFAULT_SCENARIOS[0].temperature;
    chatbotConfig.botVoice = DEFAULT_SCENARIOS[0].voice;
  }
  res.json({ success: true, scenarios: [...DEFAULT_SCENARIOS, ...customScenarios], activeScenarioId });
});

// --- FACEBOOK OAUTH INTEGRATION STATE & ENDPOINTS ---

interface ConnectedPage {
  id: string;
  name: string;
  accessToken: string;
  category?: string;
}

let activeConnectedPages: ConnectedPage[] = [];
let selectedPageId: string = "";

function getActivePageAccessToken() {
  const activePage = activeConnectedPages.find(p => p.id === selectedPageId);
  if (activePage) {
    return activePage.accessToken;
  }
  const envToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (envToken && envToken !== "YOUR_FACEBOOK_PAGE_ACCESS_TOKEN") {
    return envToken;
  }
  return null;
}

// 1. Get Facebook OAuth Login Authorization URL
app.get("/api/auth/facebook/url", (req, res) => {
  const clientRedirectUri = req.query.redirect_uri as string;
  const appId = process.env.FACEBOOK_APP_ID || "4717935218484094";
  
  if (!clientRedirectUri) {
    return res.status(400).json({ error: "Missing redirect_uri query parameter." });
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: clientRedirectUri,
    scope: "public_profile,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_show_list",
    response_type: "code",
    state: clientRedirectUri
  });

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  res.json({ url: authUrl });
});

// 2. Facebook OAuth Callback Route (returns popup closer HTML)
app.get("/auth/facebook/callback", async (req, res) => {
  const { code, state } = req.query;
  const redirectUri = state as string; // Must exactly match redirect_uri sent initially
  const appId = process.env.FACEBOOK_APP_ID || "4717935218484094";
  const appSecret = process.env.FACEBOOK_APP_SECRET || "b5e78fd449c87f1faa47a58deb9a414e";

  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  try {
    // Exchange authorize code for User Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token`;
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code: code as string
    });

    const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
    if (!tokenResponse.ok) {
      const err = await tokenResponse.json();
      throw new Error(err.error?.message || "Không thể đổi mã Code lấy User Access Token.");
    }

    const tokenData: any = await tokenResponse.json();
    const userAccessToken = tokenData.access_token;

    // Fetch Facebook Pages managed by this authenticated user
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
      const err = await pagesResponse.json();
      throw new Error(err.error?.message || "Không thể lấy danh sách Trang Facebook của bạn.");
    }

    const pagesData: any = await pagesResponse.json();
    
    if (pagesData.data && Array.isArray(pagesData.data)) {
      activeConnectedPages = pagesData.data.map((page: any) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category
      }));

      // Automatically select the first page if none is currently selected
      if (activeConnectedPages.length > 0) {
        selectedPageId = activeConnectedPages[0].id;
        process.env.FACEBOOK_PAGE_ACCESS_TOKEN = activeConnectedPages[0].accessToken;
        addLog("GET_VERIFY", `OAuth kết nối tài khoản Facebook thành công! Đã tự động kích hoạt Trang "${activeConnectedPages[0].name}" (ID: ${activeConnectedPages[0].id})`);
      }
    }

    // Return the popup closing and communication script
    res.send(`
      <html>
        <head>
          <title>Kết nối Facebook Thành công</title>
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: #f8fafc; margin: 0; text-align: center; padding: 20px; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); max-width: 400px; }
            h2 { color: #38bdf8; margin-top: 0; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
            .btn { background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px; }
            .btn:hover { background: #0369a1; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>🎉 Đã Liên Kết Thành Công!</h2>
            <p>Tài khoản Facebook của bạn đã được xác thực an toàn. Trình duyệt đang cập nhật lại danh sách các Trang Fanpage của bạn...</p>
            <button class="btn" onclick="window.close()">Đóng cửa sổ này</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              setTimeout(() => {
                window.close();
              }, 1500);
            }
          </script>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error("Facebook OAuth callback error:", err);
    res.status(500).send(`
      <html>
        <head>
          <title>Lỗi kết nối Facebook</title>
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: #f8fafc; margin: 0; text-align: center; padding: 20px; }
            .card { background: #1e293b; border: 1px solid #f43f5e; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); max-width: 400px; }
            h2 { color: #f43f5e; margin-top: 0; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
            .btn { background: #475569; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⚠️ Kết Nối Thất Bại</h2>
            <p>Không thể kết nối tài khoản Facebook. Lý do: ${err.message || err}</p>
            <button class="btn" onclick="window.close()">Đóng cửa sổ</button>
          </div>
        </body>
      </html>
    `);
  }
});

// 3. API to return currently connected pages and active page ID
app.get("/api/facebook/connected-pages", (req, res) => {
  res.json({
    pages: activeConnectedPages,
    selectedPageId: selectedPageId,
    facebookTokenConfigured: !!getActivePageAccessToken()
  });
});

// 4. API to switch active Facebook page
app.post("/api/facebook/select-page", (req, res) => {
  const { pageId } = req.body;
  const page = activeConnectedPages.find(p => p.id === pageId);
  if (!page) {
    return res.status(404).json({ error: "Không tìm thấy trang được chọn trong danh sách liên kết." });
  }
  selectedPageId = pageId;
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = page.accessToken;
  addLog("GET_VERIFY", `Đã kích hoạt trang mới thành công: "${page.name}" (ID: ${pageId})`);
  res.json({ success: true, selectedPageId, pageName: page.name });
});

// --- REAL-WORLD SYSTEM STATUS CHECK ---
app.get("/api/status", (req, res) => {
  res.json({
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    facebookTokenConfigured: !!getActivePageAccessToken(),
    facebookVerifyToken: process.env.FACEBOOK_VERIFY_TOKEN || "MayTinhMuiNeWebhookVerifySecret",
    connectedPagesCount: activeConnectedPages.length,
    selectedPageId: selectedPageId
  });
});

// --- REAL-WORLD POST PUBLISHER TO FACEBOOK FANPAGE ---
app.post("/api/publish-post", async (req, res) => {
  try {
    const { title, content, hashtags } = req.body;
    const fullMessage = `${title}\n\n${content}\n\n${hashtags ? hashtags.join(' ') : ''}`;

    const pageAccessToken = getActivePageAccessToken();

    if (!pageAccessToken || pageAccessToken === "YOUR_FACEBOOK_PAGE_ACCESS_TOKEN") {
      return res.status(400).json({ 
        error: "Chưa chọn Trang Fanpage hoạt động. Vui lòng Liên kết Tài khoản Facebook và chọn Trang của bạn trong tab Cấu hình." 
      });
    }

    // Gửi bài đăng lên Facebook Fanpage Feed API
    const fbUrl = `https://graph.facebook.com/v19.0/me/feed?access_token=${pageAccessToken}`;
    const fbResponse = await fetch(fbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: fullMessage,
      })
    });

    const fbData = await fbResponse.json();

    if (fbResponse.ok) {
      res.json({ success: true, postId: fbData.id });
    } else {
      res.status(500).json({ error: fbData.error?.message || "Lỗi không xác định từ Facebook API" });
    }
  } catch (error: any) {
    console.error("Publish post error:", error);
    res.status(500).json({ error: error.message || "Lỗi xử lý gửi bài đăng lên Facebook" });
  }
});

// --- FACEBOOK GRAPH API WEBHOOK ENDPOINTS ---

interface WebhookMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  imageUrl?: string;
  timestamp: string;
  isAudio?: boolean;
}

interface WebhookThread {
  id: string;
  customerName: string;
  customerAvatar: string;
  lastMessage: string;
  unread: boolean;
  messages: WebhookMessage[];
}

interface WebhookLog {
  id: string;
  timestamp: string;
  type: "GET_VERIFY" | "POST_RECEIVED" | "BOT_REPLIED" | "MANUAL_REPLY" | "ERROR";
  message: string;
  details?: any;
}

// In-memory data store for live sessions
const activeThreads: WebhookThread[] = [];

const activeLogs: WebhookLog[] = [
  {
    id: "log_init",
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    type: "GET_VERIFY",
    message: "Hệ thống máy chủ F-AI.HUB Máy Tính Mũi Né đã khởi chạy thành công."
  }
];

// Helper to push logs safely
function addLog(type: WebhookLog["type"], message: string, details?: any) {
  activeLogs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    type,
    message,
    details
  });
  // Keep last 100 logs
  if (activeLogs.length > 100) {
    activeLogs.pop();
  }
}

// APIs to fetch threads and logs for the frontend
app.get("/api/webhook/threads", (req, res) => {
  res.json({ threads: activeThreads });
});

app.get("/api/webhook/logs", (req, res) => {
  res.json({ logs: activeLogs });
});

app.get("/api/webhook/tunnel", (req, res) => {
  res.json({ tunnelUrl: activeTunnelUrl });
});

// Admin manual reply API
app.post("/api/webhook/threads/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { text, role = 'model', image } = req.body;

    const thread = activeThreads.find(t => t.id === id);
    if (!thread) {
      return res.status(404).json({ error: "Không tìm thấy phiên hội thoại này trên máy chủ." });
    }

    if (role === 'user') {
      // 1. Add user message
      const newMessage: WebhookMessage = {
        id: `msg_user_${Date.now()}`,
        role: 'user',
        text,
        imageUrl: image,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      thread.messages.push(newMessage);
      thread.lastMessage = text;
      thread.unread = true;

      addLog("POST_RECEIVED", `Nhận tin nhắn mô phỏng từ khách ${thread.customerName}: "${text}" ${image ? '[KÈM HÌNH ẢNH]' : ''}`);

      // 2. Generate automatic Gemini AI response as the Bot using custom configuration
      let aiReplyText = `Dạ, ${chatbotConfig.botName} xin chào anh/chị ạ! Hiện hệ thống AI đang bận một chút, anh/chị vui lòng liên hệ trực tiếp Hotline/Zalo ${chatbotConfig.zaloNumber} để bên em hỗ trợ tức thì nhé!`;

      if (ai) {
        try {
          // Prepare content parts for the current turn
          const parts: any[] = [];
          if (image) {
            const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2]
                }
              });
            } else {
              parts.push({
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image
                }
              });
            }
          }
          parts.push({ text: text });

          // Include conversation history context for a coherent dialogue
          const recentMessages = thread.messages.slice(-8); // take last 8 messages for context
          const contents: any[] = [];

          recentMessages.forEach((msg) => {
            // Avoid adding the newly created message to duplicate it
            if (msg.id !== newMessage.id) {
              const msgParts: any[] = [];
              if (msg.imageUrl) {
                const matchImg = msg.imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
                if (matchImg) {
                  msgParts.push({
                    inlineData: {
                      mimeType: matchImg[1],
                      data: matchImg[2]
                    }
                  });
                }
              }
              msgParts.push({ text: msg.text });
              contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: msgParts
              });
            }
          });

          // Append current turn message
          contents.push({
            role: 'user',
            parts: parts
          });

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: contents,
            config: {
              systemInstruction: chatbotConfig.systemPrompt,
              temperature: chatbotConfig.temperature,
            }
          });
          if (response.text) {
            aiReplyText = response.text;
          }
        } catch (aiErr: any) {
          addLog("ERROR", `Gemini API gặp sự cố phản hồi người dùng: ${aiErr.message}`);
        }
      }

      // Add bot message
      const botMessage: WebhookMessage = {
        id: `msg_bot_${Date.now()}`,
        role: 'model',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      thread.messages.push(botMessage);
      thread.lastMessage = aiReplyText;
      thread.unread = false;

      addLog("BOT_REPLIED", `AI tự động phản hồi khách hàng ${thread.customerName}: "${aiReplyText.substring(0, 80)}..."`);
    } else {
      // role === 'model' (Admin manually replies to customer)
      const newMessage: WebhookMessage = {
        id: `msg_manual_${Date.now()}`,
        role: 'model',
        text,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      thread.messages.push(newMessage);
      thread.lastMessage = text;
      thread.unread = false;

      addLog("MANUAL_REPLY", `Quản trị viên trả lời thủ công tới ${thread.customerName}: "${text}"`);

      // Send to Facebook user via Graph Send API
      const pageAccessToken = getActivePageAccessToken();
      const isRealFbUser = !id.startsWith("thread_") && !id.startsWith("sim_");
      
      if (isRealFbUser && pageAccessToken && pageAccessToken !== "YOUR_FACEBOOK_PAGE_ACCESS_TOKEN") {
        const sendUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`;
        const sendBody = {
          recipient: { id },
          message: { text },
          messaging_type: "RESPONSE"
        };

        try {
          const fbResponse = await fetch(sendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sendBody)
          });
          
          if (fbResponse.ok) {
            addLog("MANUAL_REPLY", `Đã đẩy tin nhắn thủ công qua Graph API thành công tới user: ${id}`);
          } else {
            const errData: any = await fbResponse.json();
            addLog("ERROR", `Graph API báo lỗi khi gửi tin nhắn thủ công: ${errData.error?.message || "Không rõ"}`);
          }
        } catch (fbErr: any) {
          addLog("ERROR", `Lỗi kết nối Facebook Graph API: ${fbErr.message || fbErr}`);
        }
      } else {
        addLog("MANUAL_REPLY", `[MÔ PHỎNG] Tin nhắn đã được gửi cục bộ cho cuộc hội thoại giả lập: "${text}"`);
      }
    }

    res.json({ success: true, thread });
  } catch (error: any) {
    console.error("Manual reply error:", error);
    res.status(500).json({ error: error.message || "Lỗi xử lý gửi phản hồi" });
  }
});

// Simulation endpoint (triggers full backend loop, calls Gemini API)
app.post("/api/webhook/simulate", async (req, res) => {
  try {
    const { customerName, text } = req.body;
    const simId = `sim_${Date.now()}`;
    const userMsgText = text || "Tôi muốn hỏi cấu hình PC gaming thanh lý.";

    addLog("POST_RECEIVED", `[MÔ PHỎNG] Nhận tin nhắn từ khách ${customerName || "Khách Hàng Mới"}: "${userMsgText}"`);

    // 1. Create simulated thread
    const newThread: WebhookThread = {
      id: simId,
      customerName: customerName || "Khách Hàng Mô Phỏng",
      customerAvatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?w=150&auto=format&fit=crop&q=80`,
      lastMessage: userMsgText,
      unread: true,
      messages: [
        {
          id: `msg_sim_user_${Date.now()}`,
          role: 'user',
          text: userMsgText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    activeThreads.unshift(newThread);

    // 2. Process with real Gemini AI
    let aiReplyText = `Dạ, ${chatbotConfig.botName} xin chào anh/chị ạ! Hiện hệ thống AI đang bận một chút, anh/chị vui lòng liên hệ trực tiếp Hotline/Zalo ${chatbotConfig.zaloNumber} để bên em hỗ trợ tức thì nhé!`;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ role: "user", parts: [{ text: userMsgText }] }],
          config: {
            systemInstruction: chatbotConfig.systemPrompt,
            temperature: chatbotConfig.temperature,
          }
        });
        if (response.text) {
          aiReplyText = response.text;
        }
      } catch (aiErr: any) {
        addLog("ERROR", `Gemini API gặp sự cố mô phỏng: ${aiErr.message}`);
      }
    }

    const botMessage: WebhookMessage = {
      id: `msg_sim_bot_${Date.now()}`,
      role: 'model',
      text: aiReplyText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    newThread.messages.push(botMessage);
    newThread.lastMessage = aiReplyText;

    addLog("BOT_REPLIED", `[MÔ PHỎNG] AI trả lời tự động cho ${newThread.customerName}: "${aiReplyText.substring(0, 80)}..."`);

    res.json({ success: true, thread: newThread });
  } catch (error: any) {
    console.error("Simulation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 1. Webhook Verification (GET /api/webhook)
// Dùng để Facebook verify webhook khi bấm cấu hình trên Facebook Developer Portal
app.get("/api/webhook", (req, res) => {
  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || "MayTinhMuiNeWebhookVerifySecret";
  
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log(`[FB Webhook GET] Nhận yêu cầu xác minh: mode=${mode}, token=${token}, challenge=${challenge}`);

  addLog("GET_VERIFY", `Facebook gửi yêu cầu xác minh GET: mode=${mode}, token=${token}`);

  if (mode && token) {
    const isValid = token === verifyToken;

    if (mode === "subscribe" && isValid) {
      console.log("Facebook Webhook verified successfully!");
      addLog("GET_VERIFY", "Xác minh Webhook Facebook thành công! Trả lại mã challenge.");
      return res.status(200).send(String(challenge));
    } else {
      console.warn(`Facebook Webhook verification failed: Mismatched token or mode. Received token: ${token}, Expected: ${verifyToken}`);
      addLog("ERROR", `Xác minh Webhook thất bại: Token nhận được "${token}" không khớp.`);
      return res.status(403).send("Forbidden");
    }
  }
  return res.status(400).send("Bad Request");
});

// 2. Webhook Event Handler (POST /api/webhook)
// Nhận sự kiện nhắn tin từ người dùng và tự động phản hồi qua Gemini AI
app.post("/api/webhook", async (req, res) => {
  const body = req.body;

  addLog("POST_RECEIVED", "Nhận sự kiện Webhook POST.", body);

  // 2. CHẾ ĐỘ XỬ LÝ CHO FACEBOOK WEBHOOK TRỰC TIẾP
  if (body.object === "page") {
    // Duyệt qua từng entry - có thể có nhiều tin nhắn hoặc thay đổi gộp lại
    for (const entry of body.entry) {
      
      // A. XỬ LÝ MESSENGER (MESSAGES & POSTBACKS)
      if (entry.messaging && Array.isArray(entry.messaging)) {
        for (const webhookEvent of entry.messaging) {
          const senderId = webhookEvent.sender?.id;
          if (!senderId) continue;

          // Xác định xem có phải là Postback hay không
          const isPostback = !!webhookEvent.postback;
          let messageText = "";

          if (isPostback) {
            const payload = webhookEvent.postback.payload || "";
            const title = webhookEvent.postback.title || "Nút bấm";
            messageText = `[Bấm nút: ${title}] - Payload: ${payload}`;
            addLog("POST_RECEIVED", `Nhận Messenger Postback từ (${senderId}): Nút "${title}" (Payload: ${payload})`);
          } else if (webhookEvent.message?.text) {
            messageText = webhookEvent.message.text;
          }

          // Tránh lặp vô hạn khi bot nhận lại tin nhắn của chính mình (is_echo)
          if (webhookEvent.message?.is_echo) {
            console.log("[FB Webhook] Bỏ qua tin nhắn phản hồi của chính trang (is_echo).");
            continue;
          }

          if (messageText) {
            console.log(`[FB Webhook] Nhận ${isPostback ? "postback" : "tin nhắn"} từ ${senderId}: "${messageText}"`);
            if (!isPostback) {
              addLog("POST_RECEIVED", `Nhận tin nhắn từ Facebook User ID (${senderId}): "${messageText}"`);
            }

            try {
              // Tìm hoặc tạo Thread tương ứng với User Facebook thực tế
              let thread = activeThreads.find(t => t.id === senderId);
              if (!thread) {
                let customerName = `Khách hàng Facebook (${senderId.substring(0, 6)})`;
                let customerAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";

                // Cố gắng fetch tên người dùng từ FB Graph API nếu có Token
                const pageAccessToken = getActivePageAccessToken();
                if (pageAccessToken && pageAccessToken !== "YOUR_FACEBOOK_PAGE_ACCESS_TOKEN") {
                  try {
                    const fbProfileRes = await fetch(`https://graph.facebook.com/${senderId}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`);
                    if (fbProfileRes.ok) {
                      const fbProfileData: any = await fbProfileRes.json();
                      if (fbProfileData.first_name || fbProfileData.last_name) {
                        customerName = `${fbProfileData.last_name || ""} ${fbProfileData.first_name || ""}`.trim() || customerName;
                      }
                      if (fbProfileData.profile_pic) {
                        customerAvatar = fbProfileData.profile_pic;
                      }
                      addLog("POST_RECEIVED", `Đã lấy thành công thông tin cá nhân của khách hàng: ${customerName}`);
                    }
                  } catch (profileErr) {
                    console.warn("Không thể lấy profile cá nhân từ Graph API:", profileErr);
                  }
                }

                thread = {
                  id: senderId,
                  customerName,
                  customerAvatar,
                  lastMessage: messageText,
                  unread: true,
                  messages: []
                };
                activeThreads.unshift(thread);
              }

              // Thêm tin nhắn của User vào Thread
              const newUserMessage: WebhookMessage = {
                id: `msg_fb_${Date.now()}`,
                role: "user",
                text: messageText,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              };
              thread.messages.push(newUserMessage);
              thread.lastMessage = messageText;
              thread.unread = true;

              // Chuẩn bị system prompt với thông tin "Máy Tính Mũi Né" để AI tư vấn chính xác
              const systemPrompt = `Bạn là trợ lý chăm sóc khách hàng ảo chuyên nghiệp của "Hệ Thống Máy Tính Mũi Né" - chuyên cung cấp, sửa chữa, lắp đặt máy tính, màn hình, linh kiện PC và laptop tại Mũi Né, Phan Thiết.

Thông tin liên hệ của cửa hàng:
- Địa chỉ: 🏠 100 Huỳnh Tấn Phát, Mũi Né, Phan Thiết.
- Số điện thoại / Zalo hỗ trợ kỹ thuật: ☎️ 0917 481 451

Nhiệm vụ của bạn là tư vấn các dòng sản phẩm (như màn hình máy tính thanh lý G-Net 24 inch giá 800k), dịch vụ sửa chữa phần cứng/phần mềm, lắp đặt phòng net, lắp đặt PC gaming/văn phòng 24/7 một cách nhanh chóng, chính xác và thân thiện.

Quy tắc ứng xử:
1. Xưng hô lễ phép: Sử dụng các từ "Dạ", "dạ anh/chị ạ", "Máy Tính Mũi Né xin chào", "ạ".
2. Cung cấp thông tin súc tích, dễ đọc bằng cách chia nhỏ đoạn văn và sử dụng emoji sinh động.
3. Khi khách có nhu cầu cần hỗ trợ kỹ thuật gấp hoặc giao dịch phức tạp, hãy chủ động nhắc khách hàng liên hệ trực tiếp số Hotline/Zalo: 0917 481 451 hoặc khởi tạo cuộc gọi Zalo ngay trên giao diện để kỹ thuật viên phản hồi lập tức.`;

              let aiReplyText = "Dạ, Máy Tính Mũi Né xin chào anh/chị ạ! Hiện hệ thống AI đang bận một chút, anh/chị vui lòng liên hệ trực tiếp Hotline/Zalo 0917 481 451 để bên em hỗ trợ tức thì nhé!";

              if (ai) {
                const response = await ai.models.generateContent({
                  model: "gemini-3.5-flash",
                  contents: [{ role: "user", parts: [{ text: messageText }] }],
                  config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.7,
                  }
                });
                if (response.text) {
                  aiReplyText = response.text;
                }
              }

              // Thêm tin nhắn của Bot vào Thread
              const newBotMessage: WebhookMessage = {
                id: `msg_fb_bot_${Date.now()}`,
                role: "model",
                text: aiReplyText,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              };
              thread.messages.push(newBotMessage);
              thread.lastMessage = aiReplyText;

              addLog("BOT_REPLIED", `AI phản hồi tự động thành công cho ${thread.customerName}: "${aiReplyText.substring(0, 80)}..."`);

              // Gửi phản hồi lại Facebook thông qua Send API
              const pageAccessToken = getActivePageAccessToken();
              if (pageAccessToken && pageAccessToken !== "YOUR_FACEBOOK_PAGE_ACCESS_TOKEN") {
                const sendUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`;
                const sendBody = {
                  recipient: { id: senderId },
                  message: { text: aiReplyText },
                  messaging_type: "RESPONSE"
                };

                const fbResponse = await fetch(sendUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(sendBody)
                });

                if (fbResponse.ok) {
                  console.log(`[FB Webhook] Đã gửi phản hồi tự động thành công tới ${senderId}`);
                  addLog("BOT_REPLIED", `Đã đẩy phản hồi tự động qua Graph Send API thành công tới: ${senderId}`);
                } else {
                  const errorData = await fbResponse.json();
                  console.error("[FB Webhook] Gửi phản hồi thất bại:", errorData);
                  addLog("ERROR", `Gửi phản hồi thất bại qua Graph Send API: ${errorData.error?.message || "Không rõ"}`);
                }
              } else {
                console.warn("[FB Webhook] Bỏ qua việc gọi Facebook API vì chưa cấu hình FACEBOOK_PAGE_ACCESS_TOKEN hợp lệ.");
                addLog("ERROR", "Bỏ qua đẩy tin nhắn qua Graph Send API vì thiếu/sai FACEBOOK_PAGE_ACCESS_TOKEN.");
              }

            } catch (err: any) {
              console.error("[FB Webhook] Lỗi xử lý tin nhắn hoặc gửi phản hồi:", err);
              addLog("ERROR", `Lỗi xử lý luồng tin nhắn: ${err.message || err}`);
            }
          }
        }
      }

      // B. XỬ LÝ FEED EVENTS (COMMENTS, STATUS, POSTS)
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === "feed") {
            const value = change.value;
            const item = value.item; // "comment", "status", "photo", "post" etc.
            const verb = value.verb; // "add", "edited", "remove" etc.
            const fromId = value.from?.id;
            const fromName = value.from?.name || "Người dùng Facebook";
            const message = value.message || "";
            const postId = value.post_id;
            const commentId = value.comment_id;

            addLog("POST_RECEIVED", `Nhận sự kiện Feed (${item} - ${verb}) từ ${fromName} (ID: ${fromId}): "${message}"`, value);

            // Tự động trả lời bình luận nếu đó là bình luận mới thêm (item === 'comment' && verb === 'add')
            if (item === "comment" && verb === "add" && fromId) {
              // Chờ Gemini AI dịch nghĩa và sinh phản hồi bình luận
              try {
                // Tạo thread ảo hoặc thực để theo dõi bình luận của khách hàng trên giao diện cho trực quan!
                let thread = activeThreads.find(t => t.id === `comment_${fromId}`);
                if (!thread) {
                  thread = {
                    id: `comment_${fromId}`,
                    customerName: `${fromName} (Bình luận)`,
                    customerAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                    lastMessage: `[Bình luận trên bài viết] ${message}`,
                    unread: true,
                    messages: []
                  };
                  activeThreads.unshift(thread);
                }

                // Thêm tin nhắn của User vào Thread
                const newUserMessage: WebhookMessage = {
                  id: `comment_msg_${Date.now()}`,
                  role: "user",
                  text: `[Bình luận bài viết] ${message}`,
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                };
                thread.messages.push(newUserMessage);
                thread.lastMessage = `[Bình luận] ${message}`;

                const systemPrompt = `Bạn là trợ lý chăm sóc khách hàng ảo chuyên nghiệp của "Hệ Thống Máy Tính Mũi Né" - chuyên cung cấp, sửa chữa, lắp đặt máy tính, màn hình, linh kiện PC và laptop tại Mũi Né, Phan Thiết.
Nhiệm vụ của bạn là trả lời ngắn gọn, thân thiện và lịch sự các bình luận của khách hàng trên trang Fanpage. Hãy đưa ra câu trả lời trực tiếp, ngắn gọn và hữu ích.
Hotline/Zalo hỗ trợ kỹ thuật: ☎️ 0917 481 451.`;

                let aiReplyText = "Dạ chào anh/chị ạ! Anh/chị vui lòng liên hệ trực tiếp Hotline/Zalo 0917 481 451 để bên em tư vấn chi tiết nhất nhé!";
                if (ai) {
                  const response = await ai.models.generateContent({
                    model: "gemini-3.5-flash",
                    contents: [{ role: "user", parts: [{ text: message }] }],
                    config: {
                      systemInstruction: systemPrompt,
                      temperature: 0.7,
                    }
                  });
                  if (response.text) {
                    aiReplyText = response.text;
                  }
                }

                const newBotMessage: WebhookMessage = {
                  id: `comment_bot_${Date.now()}`,
                  role: "model",
                  text: aiReplyText,
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                };
                thread.messages.push(newBotMessage);
                thread.lastMessage = aiReplyText;

                addLog("BOT_REPLIED", `AI phản hồi bình luận thành công cho ${fromName}: "${aiReplyText.substring(0, 80)}..."`);

                // Nếu có Token, trả lời thẳng vào comment_id trên Facebook
                const pageAccessToken = getActivePageAccessToken();
                if (pageAccessToken && pageAccessToken !== "YOUR_FACEBOOK_PAGE_ACCESS_TOKEN" && commentId) {
                  const replyUrl = `https://graph.facebook.com/v19.0/${commentId}/comments?access_token=${pageAccessToken}`;
                  const commentResponse = await fetch(replyUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: aiReplyText })
                  });
                  if (commentResponse.ok) {
                    addLog("BOT_REPLIED", `Đã đẩy phản hồi bình luận tự động thành công lên Facebook cho bình luận: ${commentId}`);
                  } else {
                    const errData = await commentResponse.json();
                    addLog("ERROR", `Không thể gửi phản hồi bình luận lên Facebook: ${errData.error?.message || "Không rõ"}`);
                  }
                }
              } catch (err: any) {
                console.error("[FB Webhook] Lỗi xử lý bình luận:", err);
                addLog("ERROR", `Lỗi xử lý bình luận Feed: ${err.message || err}`);
              }
            }
          }
        }
      }
    }

    // Trả về 200 OK để báo cho Facebook biết đã nhận được sự kiện thành công
    return res.status(200).send("EVENT_RECEIVED");
  } else {
    // Trả về 404 nếu không đúng object
    return res.status(404).send("Not Found");
  }
});

// Vite middleware configuration
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Khởi tạo tunnelmole để expose webhook ra internet công khai (bỏ qua chặn cookie của AI Studio proxy và không có trang cảnh báo)
    try {
      console.log(`Starting tunnelmole on port ${PORT}...`);
      if (process.env.NODE_ENV !== "production") {
        const { tunnelmole } = await import("tunnelmole");
        const url = await tunnelmole({ port: PORT });
        activeTunnelUrl = url;
      console.log(`Tunnelmole is active! Public URL: ${activeTunnelUrl}`);
      addLog("GET_VERIFY", `Khởi tạo kết nối Tunnel công khai thành công qua Tunnelmole: ${activeTunnelUrl}`);
      }
    } catch (err: any) {
      console.error("Failed to start tunnelmole:", err);
      addLog("ERROR", `Lỗi khởi chạy Tunnel: ${err.message || err}`);
    }
  });
}

setupVite();
