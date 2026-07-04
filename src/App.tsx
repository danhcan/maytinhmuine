import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  User, 
  Settings, 
  Send, 
  FileText, 
  Volume2, 
  Phone, 
  Image as ImageIcon, 
  Sparkles, 
  Plus, 
  Trash2, 
  Search, 
  MessageSquare, 
  Share2, 
  Heart, 
  MessageCircle, 
  Check, 
  Loader2, 
  HelpCircle, 
  Edit3, 
  Layers, 
  Wifi, 
  ExternalLink, 
  FilePlus2, 
  RefreshCw,
  Sliders,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  GripVertical,
  Facebook
} from "lucide-react";
import { FAQScenario, ChatbotConfig, FacebookPost, CustomerThread, Message } from "./types";
import { INITIAL_CONFIG, INITIAL_FAQS, INITIAL_THREADS, INITIAL_POSTS } from "./data";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chatbot' | 'config' | 'posts' | 'facebook'>('dashboard');

  // Conversation Memory Limit (Number of recent messages sent as context)
  const [conversationMemoryLimit, setConversationMemoryLimit] = useState<number>(10);

  // Application State
  const [config, setConfig] = useState<ChatbotConfig>(INITIAL_CONFIG);
  const [faqs, setFaqs] = useState<FAQScenario[]>(INITIAL_FAQS);
  const [threads, setThreads] = useState<CustomerThread[]>(INITIAL_THREADS);
  const [posts, setPosts] = useState<FacebookPost[]>(INITIAL_POSTS);

  // Active chat state
  const [selectedThreadId, setSelectedThreadId] = useState<string>(INITIAL_THREADS[0]?.id || "");
  const [chatInput, setChatInput] = useState<string>("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  
  // TTS & Audio State
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [ttsVoice, setTtsVoice] = useState<string>('Kore'); // 'Kore' | 'Fenrir' | 'Puck' etc
  const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);

  // New Post State
  const [postPrompt, setPostPrompt] = useState<string>("");
  const [postTone, setPostTone] = useState<string>("Hào hứng & Thu hút");
  const [postKeywords, setPostKeywords] = useState<string>("thời trang bền vững, lanh tự nhiên, lối sống xanh");
  const [isGeneratingPost, setIsGeneratingPost] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<{
    title: string;
    content: string;
    hashtags: string[];
    seoKeywords: string[];
    seoAnalysis: string;
  } | null>(null);

  // Upload/Effect State for Posts
  const [postImage, setPostImage] = useState<string>("https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop&q=80");
  const [postImageEffect, setPostImageEffect] = useState<string>("glow");

  // Attached Product State for new post
  const [hasProduct, setHasProduct] = useState<boolean>(false);
  const [productName, setProductName] = useState<string>("");
  const [productPrice, setProductPrice] = useState<string>("");

  // Facebook Connection states
  const [isFbConnected, setIsFbConnected] = useState<boolean>(true);
  const [fbAccountName, setFbAccountName] = useState<string>("Danh Can (danhcan@gmail.com)");
  const [selectedFbPageId, setSelectedFbPageId] = useState<string>("page_1");
  const [isSyncingFb, setIsSyncingFb] = useState<boolean>(false);
  const [fbAppId, setFbAppId] = useState<string>("4717935218484094");
  const [fbPageToken, setFbPageToken] = useState<string>("EAAGzk8ZBo20IBAO...xYz789");

  interface ConnectedFbPage {
    id: string;
    name: string;
    accessToken: string;
    category?: string;
  }

  const [connectedPages, setConnectedPages] = useState<ConnectedFbPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [isConnectingFb, setIsConnectingFb] = useState<boolean>(false);

  // Layout Resizing and Drag & Drop Module Manager
  const [dashboardModules, setDashboardModules] = useState<any[]>(() => {
    const saved = localStorage.getItem('dashboard_modules_layout');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return [
      { id: 'welcome', title: 'Giới thiệu & Chào mừng AI', colSpan: 2, heightClass: 'h-auto', order: 0, visible: true },
      { id: 'stats', title: 'Thông số Chatbot AI', colSpan: 1, heightClass: 'h-auto', order: 1, visible: true },
      { id: 'guide', title: 'Hướng dẫn sử dụng', colSpan: 1, heightClass: 'h-auto', order: 2, visible: true },
      { id: 'logs', title: 'Nhật ký Webhook Live', colSpan: 2, heightClass: 'h-80', order: 3, visible: true },
      { id: 'posts_analytic', title: 'Hiệu suất Bài đăng SEO AI', colSpan: 1, heightClass: 'h-auto', order: 4, visible: true },
      { id: 'faqs', title: 'Kho FAQs Huấn luyện Nhanh', colSpan: 2, heightClass: 'h-80', order: 5, visible: true },
    ];
  });
  const [isLayoutMode, setIsLayoutMode] = useState<boolean>(false);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (!sourceIndexStr) return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (sourceIndex === targetIndex) return;

    const updated = [...dashboardModules];
    const [removed] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, removed);
    
    const ordered = updated.map((mod, idx) => ({ ...mod, order: idx }));
    setDashboardModules(ordered);
  };

  const moveModule = (direction: 'up' | 'down', index: number) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dashboardModules.length) return;
    
    const updated = [...dashboardModules];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    const ordered = updated.map((mod, idx) => ({ ...mod, order: idx }));
    setDashboardModules(ordered);
  };

  const updateModuleSpan = (id: string, colSpan: 1 | 2 | 3) => {
    setDashboardModules(prev => prev.map(mod => mod.id === id ? { ...mod, colSpan } : mod));
  };

  const updateModuleHeight = (id: string, heightClass: string) => {
    setDashboardModules(prev => prev.map(mod => mod.id === id ? { ...mod, heightClass } : mod));
  };

  const toggleModuleVisibility = (id: string) => {
    setDashboardModules(prev => prev.map(mod => mod.id === id ? { ...mod, visible: !mod.visible } : mod));
  };

  const saveLayout = () => {
    localStorage.setItem('dashboard_modules_layout', JSON.stringify(dashboardModules));
    setIsLayoutMode(false);
  };

  const resetLayout = () => {
    const defaults = [
      { id: 'welcome', title: 'Giới thiệu & Chào mừng AI', colSpan: 2, heightClass: 'h-auto', order: 0, visible: true },
      { id: 'stats', title: 'Thông số Chatbot AI', colSpan: 1, heightClass: 'h-auto', order: 1, visible: true },
      { id: 'guide', title: 'Hướng dẫn sử dụng', colSpan: 1, heightClass: 'h-auto', order: 2, visible: true },
      { id: 'logs', title: 'Nhật ký Webhook Live', colSpan: 2, heightClass: 'h-80', order: 3, visible: true },
      { id: 'posts_analytic', title: 'Hiệu suất Bài đăng SEO AI', colSpan: 1, heightClass: 'h-auto', order: 4, visible: true },
      { id: 'faqs', title: 'Kho FAQs Huấn luyện Nhanh', colSpan: 2, heightClass: 'h-80', order: 5, visible: true },
    ];
    setDashboardModules(defaults);
    localStorage.removeItem('dashboard_modules_layout');
    setIsLayoutMode(false);
  };

  const fetchConnectedPages = async () => {
    try {
      const res = await fetch("/api/facebook/connected-pages");
      if (res.ok) {
        const data = await res.json();
        setConnectedPages(data.pages || []);
        setSelectedPageId(data.selectedPageId || "");
      }
    } catch (err) {
      console.error("Error fetching connected pages:", err);
    }
  };

  const handleConnectFacebook = async () => {
    setIsConnectingFb(true);
    try {
      const tunnelRes = await fetch("/api/webhook/tunnel");
      if (!tunnelRes.ok) throw new Error("Could not fetch tunnel URL from server.");
      const tunnelData = await tunnelRes.json();
      const publicOrigin = tunnelData.tunnelUrl ? tunnelData.tunnelUrl.replace('/api/webhook', '') : window.location.origin;

      const redirectUri = `${publicOrigin}/auth/facebook/callback`;
      
      const response = await fetch(`/api/auth/facebook/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) throw new Error("Failed to fetch auth URL");
      
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'facebook_oauth_popup',
        'width=650,height=650,scrollbars=yes,status=yes'
      );

      if (!authWindow) {
        alert('⚠️ Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép pop-up và thử lại.');
      }
    } catch (error: any) {
      console.error("Facebook connection error:", error);
      alert(`⚠️ Không thể kết nối Facebook: ${error.message}`);
    } finally {
      setIsConnectingFb(false);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    try {
      const response = await fetch("/api/facebook/select-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId })
      });
      if (response.ok) {
        setSelectedPageId(pageId);
        // Refresh status
        fetch("/api/status")
          .then(res => res.json())
          .then(data => setRealStatus(data));
      } else {
        const err = await response.json();
        alert(`⚠️ Lỗi chọn trang: ${err.error || "Không rõ"}`);
      }
    } catch (error: any) {
      console.error("Select page error:", error);
    }
  };

  const [chatSenderRole, setChatSenderRole] = useState<'user' | 'model'>('user');

  // --- AI CUSTOM CONFIG & SCENARIOS STATES ---
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>("sales");
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState<boolean>(false);
  const [newScenarioName, setNewScenarioName] = useState<string>("");
  const [newScenarioDesc, setNewScenarioDesc] = useState<string>("");
  const [newScenarioPrompt, setNewScenarioPrompt] = useState<string>("");
  const [newScenarioTemp, setNewScenarioTemp] = useState<number>(0.7);
  const [newScenarioVoice, setNewScenarioVoice] = useState<string>("Zephyr");

  const fetchChatbotConfig = async () => {
    try {
      const res = await fetch("/api/chatbot/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setActiveScenarioId(data.activeScenarioId);
        setScenarios(data.scenarios);
        if (data.config && data.config.botVoice) {
          setTtsVoice(data.config.botVoice);
        }
      }
    } catch (err) {
      console.error("Error fetching chatbot config:", err);
    }
  };

  const saveChatbotConfig = async (updatedFields: any = {}) => {
    setIsSavingConfig(true);
    try {
      const payload = { ...config, ...updatedFields };
      const res = await fetch("/api/chatbot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setActiveScenarioId(data.activeScenarioId);
        if (data.config && data.config.botVoice) {
          setTtsVoice(data.config.botVoice);
        }
      }
    } catch (err) {
      console.error("Error saving chatbot config:", err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim() || !newScenarioPrompt.trim()) return;
    try {
      const res = await fetch("/api/chatbot/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newScenarioName,
          description: newScenarioDesc,
          systemPrompt: newScenarioPrompt,
          temperature: newScenarioTemp,
          voice: newScenarioVoice
        })
      });
      if (res.ok) {
        const data = await res.json();
        setScenarios(data.scenarios);
        setShowCreateScenarioModal(false);
        setNewScenarioName("");
        setNewScenarioDesc("");
        setNewScenarioPrompt("");
        setNewScenarioTemp(0.7);
        setNewScenarioVoice("Zephyr");
        if (data.preset) {
          handleSelectScenario(data.preset.id);
        }
      }
    } catch (err) {
      console.error("Error creating scenario:", err);
    }
  };

  const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa kịch bản tùy chỉnh này?")) return;
    try {
      const res = await fetch(`/api/chatbot/scenarios/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        setScenarios(data.scenarios);
        setActiveScenarioId(data.activeScenarioId);
        fetchChatbotConfig();
      }
    } catch (err) {
      console.error("Error deleting scenario:", err);
    }
  };

  const handleSelectScenario = async (id: string) => {
    try {
      const res = await fetch("/api/chatbot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeScenarioId: id })
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setActiveScenarioId(data.activeScenarioId);
        if (data.config && data.config.botVoice) {
          setTtsVoice(data.config.botVoice);
        }
      }
    } catch (err) {
      console.error("Error switching scenario:", err);
    }
  };

  // Manual FAQ creator state
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");

  // Post search query
  const [postSearchQuery, setPostSearchQuery] = useState("");

  // Real-world configuration status from backend
  const [realStatus, setRealStatus] = useState<{
    geminiConfigured: boolean;
    facebookTokenConfigured: boolean;
    facebookVerifyToken: string;
  } | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const getPublicWebhookUrl = () => {
    const origin = window.location.origin;
    if (origin.includes("ais-dev-")) {
      return origin.replace("ais-dev-", "ais-pre-") + "/api/webhook";
    }
    return origin + "/api/webhook";
  };

  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);

  const syncThreadsAndLogs = async () => {
    try {
      const [threadsRes, logsRes, tunnelRes] = await Promise.all([
        fetch("/api/webhook/threads"),
        fetch("/api/webhook/logs"),
        fetch("/api/webhook/tunnel").catch(() => null)
      ]);
      if (threadsRes.ok) {
        const threadsData = await threadsRes.json();
        if (threadsData.threads) {
          setThreads(threadsData.threads);
        }
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.logs) {
          setServerLogs(logsData.logs);
        }
      }
      if (tunnelRes && tunnelRes.ok) {
        const tunnelData = await tunnelRes.json();
        if (tunnelData.tunnelUrl) {
          const baseUrl = tunnelData.tunnelUrl.endsWith("/") ? tunnelData.tunnelUrl.slice(0, -1) : tunnelData.tunnelUrl;
          setTunnelUrl(baseUrl + "/api/webhook");
        } else {
          setTunnelUrl(null);
        }
      }
    } catch (err) {
      console.error("Error syncing threads/logs:", err);
    }
  };

  useEffect(() => {
    fetch("/api/status")
      .then(res => res.json())
      .then(data => setRealStatus(data))
      .catch(err => console.error("Error fetching real system status:", err));

    fetchConnectedPages();
    fetchChatbotConfig();

    // Initial sync and poll every 3 seconds for real-time connection
    syncThreadsAndLogs();
    const interval = setInterval(syncThreadsAndLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchConnectedPages();
        fetch("/api/status")
          .then(res => res.json())
          .then(data => setRealStatus(data))
          .catch(err => console.error("Error fetching status:", err));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // File Upload Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageRef = useRef<HTMLInputElement>(null);

  // Auto scroll chat list
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedThread = threads.find(t => t.id === selectedThreadId) || threads[0] || null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThread?.messages, isBotTyping]);

  // Handle chat message submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread) return;
    if (!chatInput.trim() && !attachedImage) return;

    const userMsgText = chatInput;
    const currentAttachedImage = attachedImage;
    setChatInput("");
    setAttachedImage(null);

    if (chatSenderRole === 'user') {
      setIsBotTyping(true);
    }

    // Create a manual response message instantly on the UI for great responsiveness
    const newMessage: Message = {
      id: `msg_manual_temp_${Date.now()}`,
      role: chatSenderRole,
      text: userMsgText,
      imageUrl: currentAttachedImage || undefined,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setThreads(prev => prev.map(t => {
      if (t.id === selectedThread.id) {
        return {
          ...t,
          lastMessage: userMsgText || "[Hình ảnh]",
          unread: false,
          messages: [...t.messages, newMessage]
        };
      }
      return t;
    }));

    try {
      const response = await fetch(`/api/webhook/threads/${selectedThread.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: userMsgText, 
          role: chatSenderRole,
          image: currentAttachedImage
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.thread) {
          // Update local state with the official thread structure from the server
          setThreads(prev => prev.map(t => t.id === selectedThread.id ? data.thread : t));
        }
      }
    } catch (err) {
      console.error("Failed to send reply to server:", err);
    } finally {
      if (chatSenderRole === 'user') {
        setIsBotTyping(false);
      }
    }
  };

  // Safe manual keyword fallback & FAQ lookup
  const fallbackReply = (input: string) => {
    // 1. Check if matches FAQ questions
    const matchedFaq = faqs.find(f => 
      input.toLowerCase().includes(f.question.toLowerCase()) || 
      f.question.toLowerCase().includes(input.toLowerCase())
    );

    // 2. Check if matches any product associated with posts (e.g. "màn hình", "800k")
    const matchedProductPost = posts.find(p => {
      if (!p.product) return false;
      const lowerInput = input.toLowerCase();
      const lowerProdName = p.product.name.toLowerCase();
      return lowerInput.includes(lowerProdName) || 
             (lowerInput.includes("màn hình") && lowerProdName.includes("màn hình")) ||
             (lowerInput.includes("800k") && p.product.price.toLowerCase().includes("800")) ||
             (lowerInput.includes("giá") && (lowerInput.includes("màn") || lowerInput.includes("sản phẩm") || lowerInput.includes("bán")));
    });

    let replyText = "";
    if (matchedFaq) {
      replyText = `🤖 [Auto-FAQ Match] Dạ, về câu hỏi của quý khách:\n\n${matchedFaq.answer}`;
    } else if (matchedProductPost && matchedProductPost.product) {
      replyText = `🖥️ [Auto-Product Match] Dạ chào anh/chị, về sản phẩm **${matchedProductPost.product.name}** đính kèm trong bài viết của shop, hiện có giá bán công khai là **${matchedProductPost.product.price}** ạ! Anh/chị có muốn chốt đơn hoặc cần hỗ trợ gọi Zalo gấp để tư vấn không ạ?`;
    } else {
      // Check if contains fallback high priority keywords
      const isUrgent = config.fallbackKeywords.some(keyword => input.toLowerCase().includes(keyword.toLowerCase()));
      
      if (isUrgent) {
        replyText = `🚨 [HỘ TRỢ KHẨN CẤP] Chào anh/chị, em nhận thấy yêu cầu của anh/chị rất quan trọng và cần xử lý ngay lập tức.\n\nVui lòng gọi điện trực tiếp hotline Zalo: **${config.zaloNumber}** (${config.zaloName}) để được nhân sự hỗ trợ khẩn cấp trong vòng 2 phút ạ!`;
      } else {
        replyText = `🤖 [Bot Chế độ Offline] Cảm ơn bạn đã liên hệ EcoStyle! Tin nhắn của bạn đang được chuyển đến tư vấn viên. Trợ lý AI đang tiếp tục xử lý thông tin. Quý khách vui lòng tham khảo Địa chỉ tại 285 CMT8, Q10 hoặc gọi Hotline Zalo ${config.zaloNumber} nhé ạ!`;
      }
    }

    const botMessage: Message = {
      id: `msg_offline_${Date.now()}`,
      role: 'model',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setThreads(prev => prev.map(t => {
      if (t.id === selectedThread.id) {
        return {
          ...t,
          lastMessage: botMessage.text,
          messages: [...t.messages, botMessage]
        };
      }
      return t;
    }));
  };

  // Call API for TTS (Voice) Generation and Playback
  const handlePlayVoice = async (msg: Message) => {
    if (playingMsgId === msg.id) {
      setPlayingMsgId(null);
      return;
    }

    setIsGeneratingTts(true);
    setPlayingMsgId(msg.id);

    try {
      // Call server side API for Text-to-Speech
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msg.text.replace(/[\*#_]/g, ''), // strip markdown markers
          voice: ttsVoice
        })
      });

      const data = await response.json();
      if (response.ok && data.audio) {
        const audioUrl = `data:audio/mp3;base64,${data.audio}`;
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => {
          setPlayingMsgId(null);
        };
      } else {
        alert("Không thể chuyển đổi văn bản thành giọng nói. Vui lòng kiểm tra lại thiết lập Secrets.");
        setPlayingMsgId(null);
      }
    } catch (err) {
      console.error("TTS generation error:", err);
      alert("Lỗi phát giọng nói từ AI.");
      setPlayingMsgId(null);
    } finally {
      setIsGeneratingTts(false);
    }
  };

  // Call API to generate dynamic SEO post content
  const handleGeneratePostWithAI = async () => {
    if (!postPrompt.trim()) return;
    setIsGeneratingPost(true);
    try {
      const response = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: postPrompt,
          tone: postTone,
          keywords: postKeywords,
          optimizeSEO: true
        })
      });

      const data = await response.json();
      if (response.ok && data.content) {
        setGeneratedResult(data);
      } else {
        // Fallback manual simulation
        setGeneratedResult({
          title: `🌟 SIÊU PHẨM: ${postPrompt.toUpperCase()} CHUẨN XU HƯỚNG`,
          content: `Bạn đã biết về trào lưu cực hot ${postPrompt} chưa? ✨\n\nSản phẩm được lấy cảm hứng từ phong cách sống tinh giản hiện đại, mang đến nét đột phá cho phong cách cá nhân của bạn. Được nghiên cứu kỹ lưỡng để tối ưu hóa trải nghiệm tốt nhất.\n\nSắm ngay hôm nay tại EcoStyle để nhận hàng ngàn quà tặng hấp dẫn cùng chính sách miễn phí giao hàng ưu đãi độc quyền toàn quốc!`,
          hashtags: ["#EcoStyle", `#${postPrompt.replace(/\s+/g, '')}`, "#SEO_Optimal", "#TrendingNow"],
          seoKeywords: postKeywords.split(',').map(s => s.trim()),
          seoAnalysis: "Bài viết tối ưu hóa nhờ đưa từ khóa chính trực tiếp lên đầu, kết cấu mạch lạc, kích thích chuyển đổi kèm bộ thẻ hashtag chuẩn xác nhất."
        });
      }
    } catch (err) {
      console.error("Post generation err:", err);
      // fallback
      setGeneratedResult({
        title: `🌿 ${postPrompt.toUpperCase()} - SỐNG XANH HẠNH PHÚC`,
        content: `Cùng hành động vì một lối sống bền vững và lành mạnh hơn với sản phẩm ${postPrompt} 🌿\n\nCửa hàng luôn tuyển chọn những nguồn nguyên liệu sạch nhất, thân thiện nhất đối với người dùng. Cảm nhận sự khác biệt từ chi tiết nhỏ nhất ngay hôm nay!\n\nĐịa chỉ: 285 Cách Mạng Tháng Tám, Quận 10.`,
        hashtags: ["#SốngXanh", "#EcoStyle", "#EcoFriendly"],
        seoKeywords: ["sản phẩm thân thiện môi trường", "lối sống xanh"],
        seoAnalysis: "Bài viết dùng giọng điệu ấm áp truyền cảm hứng, tích hợp CTA rõ ràng."
      });
    } finally {
      setIsGeneratingPost(false);
    }
  };

  const [isPublishingToFb, setIsPublishingToFb] = useState<boolean>(false);

  // Save the generated/edited post to official feed list
  const handlePublishPost = async () => {
    if (!generatedResult) return;

    setIsPublishingToFb(true);
    let realPublishSuccess = false;
    let realPostId = "";

    try {
      if (realStatus?.facebookTokenConfigured) {
        const response = await fetch("/api/publish-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: generatedResult.title,
            content: generatedResult.content,
            hashtags: generatedResult.hashtags,
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          realPublishSuccess = true;
          realPostId = data.postId;
          alert(`🎉 Đăng bài viết lên Fanpage Facebook thật thành công! ID bài viết: ${data.postId}`);
        } else {
          console.warn("Publish to Facebook failed:", data.error);
          alert(`⚠️ Đã lưu bài viết cục bộ.\nKhông thể đăng trực tiếp lên Facebook thật. Chi tiết: ${data.error || 'Lỗi không xác định'}`);
        }
      } else {
        alert("💡 Bài viết đã được lưu vào Lịch sử bài đăng hệ thống!\n(Để đăng lên Fanpage Facebook thực tế, vui lòng kết nối tài khoản Facebook và chọn Trang của bạn trong tab Kết nối Facebook)");
      }
    } catch (error: any) {
      console.error("Publish to Facebook error:", error);
      alert(`⚠️ Không kết nối được API: ${error.message}. Bài viết đã được lưu cục bộ.`);
    } finally {
      setIsPublishingToFb(false);
    }

    const newPost: FacebookPost = {
      id: realPostId || `post_${Date.now()}`,
      title: generatedResult.title,
      content: generatedResult.content,
      hashtags: generatedResult.hashtags,
      seoKeywords: generatedResult.seoKeywords,
      imageUrl: postImage,
      imageEffect: postImageEffect,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: realPublishSuccess ? 'published' : 'scheduled',
      likes: realPublishSuccess ? 0 : Math.floor(Math.random() * 30),
      comments: 0,
      shares: 0,
      product: hasProduct && productName.trim() ? {
        name: productName.trim(),
        price: productPrice.trim() || "Liên hệ"
      } : undefined
    };

    setPosts([newPost, ...posts]);
    setGeneratedResult(null);
    setPostPrompt("");
    setHasProduct(false);
    setProductName("");
    setProductPrice("");
    setActiveTab('posts'); // switch to post history tab
  };

  // Add a custom FAQ kịch bản
  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const newFaq: FAQScenario = {
      id: `faq_${Date.now()}`,
      question: newFaqQuestion,
      answer: newFaqAnswer
    };

    setFaqs([...faqs, newFaq]);
    setNewFaqQuestion("");
    setNewFaqAnswer("");
  };

  // Delete an FAQ
  const handleDeleteFaq = (id: string) => {
    setFaqs(faqs.filter(f => f.id !== id));
  };

  // Image Upload helpers for Post Creator
  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Image Upload helper for Chat attachment
  const handleChatImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Simulated Like/Share actions on published posts
  const handleLikePost = (postId: string) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
  };

  // Filter posts based on search query
  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(postSearchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(postSearchQuery.toLowerCase()) ||
    p.seoKeywords.some(k => k.toLowerCase().includes(postSearchQuery.toLowerCase()))
  );

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
      
      {/* MOBILE STICKY HEADER & COMPACT TAB BAR */}
      <header className="lg:hidden bg-slate-900 border-b border-slate-800 p-3.5 sticky top-0 z-40 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-100">F-AI.HUB</h1>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Máy Tính Mũi Né</p>
            </div>
          </div>
          <a 
            href={`https://zalo.me/${config.zaloNumber}`} 
            target="_blank" 
            rel="noreferrer"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
          >
            <PhoneCall className="w-3 h-3" /> HOTLINE ZALO
          </a>
        </div>
        
        {/* Horizontal scrollable navigation tabs for Mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scroll-smooth no-scrollbar select-none">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
            }`}
          >
            📊 Tổng quan
          </button>
          <button 
            onClick={() => setActiveTab('chatbot')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 ${
              activeTab === 'chatbot' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
            }`}
          >
            💬 Chatbot AI
            {threads.filter(t => t.unread).length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {threads.filter(t => t.unread).length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'config' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
            }`}
          >
            ⚙️ Cấu hình AI
          </button>
          <button 
            onClick={() => setActiveTab('facebook')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'facebook' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
            }`}
          >
            🔑 Kết nối FB
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'posts' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
            }`}
          >
            📝 Bài đăng ({posts.length})
          </button>
        </div>
      </header>

      {/* SIDEBAR NAVIGATION - BOLD THEME */}
      <aside className="hidden lg:flex w-80 border-r border-slate-800 bg-slate-900 flex-col p-6 shrink-0 transition-all">
        <div className="mb-4 p-2 bg-slate-950/40 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-emerald-400">F-AI.HUB</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Máy Tính Mũi Né v2.5</p>
            </div>
          </div>
        </div>

        {/* THÔNG TIN CHI NHÁNH MŨI NÉ */}
        <div className="mb-6 p-3 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-1.5">
          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Thông tin Máy Tính Mũi Né</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-1.5 text-slate-300 font-medium leading-tight">
              <span className="text-emerald-400 shrink-0 font-sans">🏠</span>
              <span>100 Huỳnh Tấn Phát, Mũi Né, Phan Thiết</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="text-emerald-400 shrink-0 font-sans">☎️</span>
              <span className="font-mono">0917 481 451</span>
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION BUTTONS */}
        <nav className="flex-1 space-y-2">
          <button 
            id="btn_nav_dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full p-3 rounded-xl text-left font-semibold tracking-tight text-xs uppercase transition-all duration-150 flex items-center justify-between ${
              activeTab === 'dashboard' 
                ? 'bg-slate-850 border-l-4 border-emerald-500 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-4 border-transparent'
            }`}
          >
            <span>📊 Tổng quan dự án</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">LIVE</span>
          </button>

          <button 
            id="btn_nav_chatbot"
            onClick={() => setActiveTab('chatbot')}
            className={`w-full p-3 rounded-xl text-left font-semibold tracking-tight text-xs uppercase transition-all duration-150 flex items-center justify-between ${
              activeTab === 'chatbot' 
                ? 'bg-slate-850 border-l-4 border-emerald-500 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-4 border-transparent'
            }`}
          >
            <span>💬 Giám sát Chatbot AI</span>
            {threads.filter(t => t.unread).length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 font-bold rounded-full animate-pulse">
                {threads.filter(t => t.unread).length} mới
              </span>
            )}
          </button>

          <button 
            id="btn_nav_config"
            onClick={() => setActiveTab('config')}
            className={`w-full p-3 rounded-xl text-left font-semibold tracking-tight text-xs uppercase transition-all duration-150 flex items-center justify-between ${
              activeTab === 'config' 
                ? 'bg-slate-850 border-l-4 border-emerald-500 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-4 border-transparent'
            }`}
          >
            <span>⚙️ Cấu hình AI & Kịch bản</span>
            <Sliders className="w-4 h-4 text-slate-500" />
          </button>

          <button 
            id="btn_nav_facebook"
            onClick={() => setActiveTab('facebook')}
            className={`w-full p-3 rounded-xl text-left font-semibold tracking-tight text-xs uppercase transition-all duration-150 flex items-center justify-between ${
              activeTab === 'facebook' 
                ? 'bg-slate-850 border-l-4 border-emerald-500 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-4 border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">🔑 Kết nối Facebook</span>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-black font-mono">10 tin</span>
          </button>

          <button 
            id="btn_nav_posts"
            onClick={() => setActiveTab('posts')}
            className={`w-full p-3 rounded-xl text-left font-semibold tracking-tight text-xs uppercase transition-all duration-150 flex items-center justify-between ${
              activeTab === 'posts' 
                ? 'bg-slate-850 border-l-4 border-emerald-500 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-4 border-transparent'
            }`}
          >
            <span>📝 Bài viết & Quản lý SEO</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
              {posts.length} bài
            </span>
          </button>
        </nav>
      </aside>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
        
        {/* TOP STATUS / COMPACT BRANDING */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-750 rounded text-slate-300 font-mono">WORKSPACE</span>
              <span>• F-AI FACEBOOK MANAGER</span>
            </div>
            <h2 className="text-lg md:text-2xl font-bold tracking-tight text-slate-100 uppercase leading-snug">
              HỆ THỐNG HỖ TRỢ <span className="text-emerald-400 font-extrabold">MÁY TÍNH MŨI NÉ</span>
            </h2>
            <p className="text-slate-400 text-xs mt-1 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Cấu hình: <span className="text-slate-300 font-mono">danhcan@gmail.com</span></span>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <span>Hotline: <span className="text-indigo-400 font-semibold">{config.zaloNumber} ({config.zaloName})</span></span>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="hidden sm:flex bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wide">Tự động 24/7</span>
            </div>
            <a 
              id="link_zalo_direct"
              href={`https://zalo.me/${config.zaloNumber}`} 
              target="_blank" 
              rel="noreferrer"
              className="flex-1 md:flex-none bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" /> GỌI ZALO KHẨN CẤP
            </a>
          </div>
        </header>

        {/* 1. DASHBOARD OVERVIEW TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            {/* LAYOUT MANAGER & CONTROLS TOOLBAR */}
            <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div>
                <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4.5 h-4.5 text-emerald-400" />
                  Bố cục Mô-đun & Chỉnh sửa Kéo Thả
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  {isLayoutMode 
                    ? "💡 Bạn đang ở chế độ chỉnh sửa. Bạn có thể kéo thả để đổi vị trí, hoặc nhấn nút kích cỡ (33%, 66%, 100%) và chiều cao tùy thích." 
                    : "Hệ thống hỗ trợ tùy chỉnh kéo thả vị trí và co giãn kích cỡ tùy ý cho từng mô-đun quản lý theo phong cách Bento-Grid."
                  }
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap z-10">
                {isLayoutMode ? (
                  <>
                    <button
                      type="button"
                      onClick={saveLayout}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Lưu bố cục
                    </button>
                    <button
                      type="button"
                      onClick={resetLayout}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-300 font-bold text-xs uppercase rounded-xl border border-slate-800 transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Mặc định
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsLayoutMode(true)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 text-xs font-black uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Chỉnh sửa Bố Cục
                  </button>
                )}
              </div>
            </div>

            {/* STATS BENTO GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <p className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider">Tự động trả lời</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-400 mt-1 tracking-tight">100%</p>
                <p className="text-[11px] text-slate-500 mt-1">Hoạt động trơn tru không nghỉ</p>
              </div>

              <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <p className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider">Hộp thư Facebook</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-100 mt-1 tracking-tight">{threads.length} Threads</p>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  {threads.filter(t => t.unread).length} hội thoại mới chưa đọc
                </p>
              </div>

              <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <p className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider">Kịch bản kích hoạt</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-amber-400 mt-1 tracking-tight">{faqs.length} FAQs</p>
                <p className="text-[11px] text-slate-500 mt-1">Sẵn sàng nhận diện từ khóa</p>
              </div>

              <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <p className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider">Bài đăng SEO AI</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-blue-400 mt-1 tracking-tight">{posts.length} bài viết</p>
                <p className="text-[11px] text-slate-500 mt-1">Đã cấu hình hiệu ứng hình ảnh</p>
              </div>
            </div>

            {/* DYNAMIC MODULES BENTO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {dashboardModules
                .filter(mod => mod.visible || isLayoutMode)
                .map((mod, idx) => {
                  // Determine grid span class
                  let spanClass = "lg:col-span-1";
                  if (mod.colSpan === 2) spanClass = "lg:col-span-2";
                  if (mod.colSpan === 3) spanClass = "lg:col-span-3";

                  // Check if currently visible in layout mode
                  const isHidden = !mod.visible;

                  return (
                    <div
                      key={mod.id}
                      className={`${spanClass} ${
                        isLayoutMode 
                          ? 'border-2 border-dashed border-emerald-500/50 bg-slate-900/90 relative group hover:border-emerald-400 transition-all rounded-2xl shadow-xl shadow-emerald-500/5' 
                          : 'bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden'
                      } ${isHidden ? 'opacity-40 border-rose-500/50 hover:border-rose-400' : ''}`}
                      draggable={isLayoutMode}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                    >
                      {/* Drag handles & layout options */}
                      {isLayoutMode && (
                        <div className="bg-slate-950 p-3 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-slate-850 select-none">
                          <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-emerald-400">
                            <GripVertical className="w-4 h-4 text-emerald-450 shrink-0" />
                            <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-300">
                              {mod.title} {isHidden && "(Đang Ẩn)"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Width selector */}
                            <span className="text-[9px] uppercase font-extrabold text-slate-500 mr-1">Rộng:</span>
                            <button 
                              type="button"
                              onClick={() => updateModuleSpan(mod.id, 1)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${mod.colSpan === 1 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'}`}
                            >
                              33%
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateModuleSpan(mod.id, 2)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${mod.colSpan === 2 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'}`}
                            >
                              66%
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateModuleSpan(mod.id, 3)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${mod.colSpan === 3 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'}`}
                            >
                              100%
                            </button>

                            {/* Height selector */}
                            <span className="text-[9px] uppercase font-extrabold text-slate-500 ml-2 mr-1">Cao:</span>
                            <button 
                              type="button"
                              onClick={() => updateModuleHeight(mod.id, 'h-auto')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${mod.heightClass === 'h-auto' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'}`}
                            >
                              Auto
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateModuleHeight(mod.id, 'h-64')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${mod.heightClass === 'h-64' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'}`}
                            >
                              S
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateModuleHeight(mod.id, 'h-80')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${mod.heightClass === 'h-80' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'}`}
                            >
                              M
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateModuleHeight(mod.id, 'h-96')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${mod.heightClass === 'h-96' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'}`}
                            >
                              L
                            </button>

                            {/* Reorder controls */}
                            <span className="text-[9px] uppercase font-extrabold text-slate-500 ml-2 mr-1">Vị Trí:</span>
                            <button 
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveModule('up', idx)}
                              className="p-1 bg-slate-900 hover:bg-slate-850 disabled:opacity-20 rounded-lg text-slate-300 transition-all border border-slate-800"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button"
                              disabled={idx === dashboardModules.length - 1}
                              onClick={() => moveModule('down', idx)}
                              className="p-1 bg-slate-900 hover:bg-slate-850 disabled:opacity-20 rounded-lg text-slate-300 transition-all border border-slate-800"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Hide control */}
                            <button 
                              type="button"
                              onClick={() => toggleModuleVisibility(mod.id)}
                              className={`p-1 rounded-lg text-xs ml-1.5 transition-all ${isHidden ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-950/40 hover:bg-rose-900/30 text-rose-400'}`}
                              title={isHidden ? "Hiện module" : "Ẩn module"}
                            >
                              {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* INNER WRAPPER FRAME WITH ADAPTIVE HEIGHT */}
                      <div className={`${mod.heightClass} overflow-y-auto custom-scrollbar p-5 md:p-6`}>
                        {/* 1. WELCOME MODULE */}
                        {mod.id === 'welcome' && (
                          <div className="relative h-full flex flex-col justify-between">
                            <div>
                              <div className="absolute top-0 right-0 text-emerald-500/10 hidden sm:block">
                                <Sparkles className="w-16 h-16 pointer-events-none" />
                              </div>
                              <h3 className="text-base md:text-xl font-bold tracking-tight mb-3 text-slate-100 uppercase">
                                TRỢ LÝ CHĂM SÓC KHÁCH HÀNG THỜI ĐẠI MỚI
                              </h3>
                              <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-5 font-normal">
                                Chào mừng bạn đến với hệ thống Máy Tính Mũi Né tích hợp Gemini AI tiên tiến nhất dành cho Facebook Fanpage. 
                                Hệ thống của bạn có khả năng tự động phản hồi hội thoại, tự tra cứu thông tin sản phẩm đính kèm từ bài viết, trả lời dựa theo kịch bản và cấu hình linh hoạt.
                                Bên cạnh đó, tích hợp sẵn công cụ sáng tạo nội dung bài viết thu hút, tự động chèn từ khóa SEO, sinh ảnh 
                                và thêm các hiệu ứng bắt mắt kích thích lượt tiếp cận tự nhiên của fanpage.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-4">
                              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                                <p className="text-[10px] font-bold uppercase text-emerald-400 mb-1">🤖 Cấu hình AI</p>
                                <p className="text-xs text-slate-400 font-medium">Tùy biến System Prompt & kịch bản thông minh cho chatbot.</p>
                                <button 
                                  onClick={() => setActiveTab('config')}
                                  className="text-emerald-400 hover:text-emerald-300 text-xs font-bold mt-2 inline-flex items-center gap-1"
                                >
                                  Tinh chỉnh ngay →
                                </button>
                              </div>

                              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                                <p className="text-[10px] font-bold uppercase text-indigo-400 mb-1">📞 Kết nối Zalo</p>
                                <p className="text-xs text-slate-400 font-medium">Khi gặp tình huống phức tạp, tự động điều hướng khách hàng.</p>
                                <button 
                                  onClick={() => setActiveTab('config')}
                                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold mt-2 inline-flex items-center gap-1"
                                >
                                  Xem số Hotline →
                                </button>
                              </div>

                              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                                <p className="text-[10px] font-bold uppercase text-amber-400 mb-1">📸 Image Dynamic FX</p>
                                <p className="text-xs text-slate-400 font-medium">Thêm hiệu ứng lung linh cho ảnh giúp nội dung bài viết sinh động.</p>
                                <button 
                                  onClick={() => setActiveTab('posts')}
                                  className="text-amber-400 hover:text-amber-300 text-xs font-bold mt-2 inline-flex items-center gap-1"
                                >
                                  Sáng tạo bài viết →
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. STATS CONFIG MODULE */}
                        {mod.id === 'stats' && (
                          <div className="flex flex-col justify-between h-full space-y-4">
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-base font-bold uppercase tracking-wider text-slate-300">Bộ Thông số Chatbot</h4>
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded">ACTIVE</span>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Tên đại diện AI:</span>
                                  <div className="bg-slate-950 px-3 py-2 rounded-lg font-mono text-sm text-emerald-400 border border-slate-800">
                                    {config.botName}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Thời gian chờ phản hồi:</span>
                                  <div className="flex items-center justify-between text-xs text-slate-300">
                                    <span>{config.autoReplyDelay} giây</span>
                                    <span className="text-slate-500">Độ trễ giúp chatbot tự nhiên hơn</span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Độ sáng tạo (Temperature):</span>
                                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full" style={{ width: `${config.creativity * 100}%` }}></div>
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                    <span>Chính xác (0.2)</span>
                                    <span>Sáng tạo (1.0)</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800/60 mt-4">
                              <button 
                                onClick={() => setActiveTab('chatbot')}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider transition-colors flex items-center justify-center gap-2"
                              >
                                <MessageSquare className="w-4 h-4" /> Giám Sát Chatbot AI ({threads.filter(t => t.unread).length} mới)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 3. HELP GUIDE MODULE */}
                        {mod.id === 'guide' && (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                                <HelpCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200">Hướng dẫn sử dụng</h4>
                                <p className="text-xs text-slate-400 mt-1">Các bước cơ bản để vận hành và theo dõi chatbot</p>
                              </div>
                            </div>

                            <ul className="space-y-2 mt-2 text-xs text-slate-300 list-inside list-decimal">
                              <li>
                                Vào mục <b className="text-indigo-400">"Cấu hình AI & Kịch bản"</b> để điều chỉnh lời chào hoặc bổ sung thêm bộ câu hỏi FAQ riêng.
                              </li>
                              <li>
                                Chuyển sang mục <b className="text-emerald-400">"Giám sát Chatbot AI"</b>, chọn khách hàng từ danh sách thực tế để trực tiếp tư vấn hoặc để AI tự động phản hồi.
                              </li>
                              <li>
                                Trong khung chat, bạn có thể <b className="text-amber-400">Tải ảnh lên</b> (để AI phân tích hình ảnh) và bấm nút <b className="text-blue-400">"Loa nghe đọc (TTS)"</b> để phát âm thanh tiếng Việt.
                              </li>
                              <li>
                                Sang mục <b className="text-teal-400">"Bài viết & Quản lý SEO"</b> để tạo bài đăng Facebook tối ưu từ khóa SEO siêu tốc.
                              </li>
                            </ul>
                          </div>
                        )}

                        {/* 4. WEBHOOK LOGS MODULE */}
                        {mod.id === 'logs' && (
                          <div className="flex flex-col h-full space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Trình nhật ký Webhook Facebook (Thời gian thực)</h4>
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            </div>
                            
                            <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[11px] space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar">
                              {serverLogs.length === 0 ? (
                                <p className="text-slate-500 italic">Chưa có hoạt động webhook nào được phát sinh. Đang lắng nghe các sự kiện gửi tin nhắn...</p>
                              ) : (
                                serverLogs.map((log: any) => {
                                  let colorClass = "text-emerald-400";
                                  if (log.type === "GET_VERIFY") colorClass = "text-sky-400 font-bold";
                                  if (log.type === "POST_RECEIVED") colorClass = "text-indigo-400";
                                  if (log.type === "BOT_REPLIED") colorClass = "text-emerald-400 font-semibold";
                                  if (log.type === "MANUAL_REPLY") colorClass = "text-amber-400 font-semibold";
                                  if (log.type === "ERROR") colorClass = "text-rose-400 font-bold animate-pulse";

                                  return (
                                    <div key={log.id} className={`${colorClass} break-all leading-relaxed border-b border-slate-900/55 pb-1`}>
                                      <span className="text-slate-500">[{log.timestamp}]</span> <span className="bg-slate-900 px-1 py-0.2 rounded border border-slate-800 text-[9px] font-bold mr-1">{log.type}</span> {log.message}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {/* 5. SEO POSTS ANALYTICS MODULE */}
                        {mod.id === 'posts_analytic' && (
                          <div className="flex flex-col justify-between h-full space-y-4">
                            <div>
                              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">Hiệu suất Bài đăng SEO AI</h4>
                              {posts.length === 0 ? (
                                <div className="text-center py-6 bg-slate-950 rounded-xl border border-slate-850">
                                  <p className="text-xs text-slate-500">Chưa có bài đăng nào được nạp</p>
                                </div>
                              ) : (
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <img src={posts[0].imageUrl} alt="Post cover" className="w-12 h-12 rounded object-cover border border-slate-800" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-200 truncate">{posts[0].title}</p>
                                      <p className="text-[10px] text-slate-500 mt-0.5">{posts[0].createdAt}</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-850">
                                    <div className="bg-slate-900/80 p-1.5 rounded">
                                      <p className="text-[9px] uppercase text-slate-500 font-bold">Thích</p>
                                      <p className="text-xs font-black text-slate-200">{posts[0].likes || 0}</p>
                                    </div>
                                    <div className="bg-slate-900/80 p-1.5 rounded">
                                      <p className="text-[9px] uppercase text-slate-500 font-bold">Bình luận</p>
                                      <p className="text-xs font-black text-slate-200">{posts[0].comments || 0}</p>
                                    </div>
                                    <div className="bg-slate-900/80 p-1.5 rounded">
                                      <p className="text-[9px] uppercase text-slate-500 font-bold">Chia sẻ</p>
                                      <p className="text-xs font-black text-slate-200">{posts[0].shares || 0}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => setActiveTab('posts')}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase rounded-xl border border-slate-750 flex items-center justify-center gap-1.5"
                            >
                              Sáng tạo bài mới <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* 6. FAQ SCENARIO PREVIEW MODULE */}
                        {mod.id === 'faqs' && (
                          <div className="flex flex-col h-full space-y-3">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Kho FAQs Huấn luyện Nhanh</h4>
                            <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
                              {faqs.map((faq, idx) => (
                                <div key={faq.id || idx} className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded">Câu hỏi {idx + 1}</span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-200">{faq.question}</p>
                                  <p className="text-xs text-slate-400 italic bg-slate-900/50 p-2 rounded-lg border border-slate-800/40 leading-relaxed">{faq.answer}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 2. CHATBOT MONITORING TAB */}
        {activeTab === 'chatbot' && (
          threads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl min-h-[500px] animate-fadeIn w-full">
              <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center text-emerald-400 mb-4 border border-slate-800">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Không có cuộc trò chuyện nào</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                Hộp thư hiện đang trống vì bạn đã xóa toàn bộ tin nhắn ảo. Hệ thống đang sẵn sàng và lắng nghe webhook từ Facebook Fanpage hoặc cổng Zalo.
              </p>
              <div className="mt-6 p-4 bg-slate-950 rounded-xl border border-slate-800 max-w-md text-left text-xs text-slate-400 space-y-2">
                <p className="font-bold text-slate-300">💡 Cách nhận tin nhắn thực tế:</p>
                <p>• Khi khách hàng thật nhắn tin tới Fanpage đã kết nối, webhook sẽ tự động đẩy hội thoại về đây.</p>
                <p>• Bạn có thể tạo bài đăng trong mục <b className="text-emerald-400">"Bài viết & Quản lý SEO"</b> để thu hút khách nhắn tin.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 flex-1 min-h-[500px] animate-fadeIn">
            
            {/* THREADS LIST COLUMN */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">Danh sách khách hàng</h3>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded">
                  {threads.length} khách
                </span>
              </div>

              {/* SEARCH BAR FOR THREADS */}
              <div className="p-3 border-b border-slate-850">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    placeholder="Tìm tên khách hàng..." 
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:border-emerald-500 text-slate-200"
                  />
                </div>
              </div>

              {/* CONTAINER FOR CONVERSATIONS */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
                {threads.map(thread => {
                  const isActive = thread.id === selectedThreadId;
                  return (
                    <button
                      id={`thread_item_${thread.id}`}
                      key={thread.id}
                      onClick={() => {
                        setSelectedThreadId(thread.id);
                        // mark as read
                        setThreads(threads.map(t => t.id === thread.id ? { ...t, unread: false } : t));
                      }}
                      className={`w-full p-4 text-left transition-all duration-150 flex items-start gap-3 relative ${
                        isActive ? 'bg-slate-800/80 border-l-4 border-emerald-500' : 'hover:bg-slate-850/50'
                      }`}
                    >
                      <img 
                        src={thread.customerAvatar} 
                        alt={thread.customerName} 
                        className="w-11 h-11 rounded-full object-cover border-2 border-slate-700 shrink-0" 
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-black text-slate-200 truncate">{thread.customerName}</p>
                          <span className="text-[10px] text-slate-500 font-mono">LIVE</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 truncate font-medium">
                          {thread.lastMessage}
                        </p>
                      </div>

                      {thread.unread && (
                        <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE CONVERSATION VIEW COLUMN */}
            <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col h-full overflow-hidden">
              
              {/* CURRENT ACTIVE CONVERSATION HEADER */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedThread.customerAvatar} 
                    alt={selectedThread.customerName} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-700" 
                  />
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                      {selectedThread.customerName}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Chatbot đang giám sát 24/7
                    </p>
                  </div>
                </div>

                {/* ESCALATION TO ZALO & VOICES PANEL */}
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2 hidden md:block">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Giọng đọc AI (TTS)</span>
                    <select 
                      value={ttsVoice} 
                      onChange={(e) => setTtsVoice(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-400 focus:outline-none"
                    >
                      <option value="Kore">Kore (Giọng Ấm)</option>
                      <option value="Fenrir">Fenrir (Giọng Trầm)</option>
                      <option value="Puck">Puck (Nhẹ nhàng)</option>
                      <option value="Aoede">Aoede (Nữ tính)</option>
                    </select>
                  </div>

                  <a 
                    href={`https://zalo.me/${config.zaloNumber}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/20 text-xs font-black uppercase flex items-center gap-1.5 transition-all"
                  >
                    <Phone className="w-4 h-4 text-indigo-400" />
                    <span>ZALO</span>
                  </a>
                </div>
              </div>

              {/* MESSAGES CONTEXT CANVAS */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/20">
                {selectedThread.messages.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Chưa có tin nhắn nào</p>
                  </div>
                ) : (
                  selectedThread.messages.map((msg) => {
                    const isBot = msg.role === 'model' || msg.role === 'system';
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                      >
                        {/* Avatar */}
                        {isBot ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 select-none">
                            AI
                          </div>
                        ) : (
                          <img 
                            src={selectedThread.customerAvatar} 
                            alt="User" 
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0" 
                          />
                        )}

                        {/* Content text */}
                        <div className="space-y-1">
                          <div className={`p-3.5 rounded-2xl relative ${
                            isBot 
                              ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60' 
                              : 'bg-emerald-500 text-slate-950 rounded-tr-none font-medium'
                          }`}>
                            {msg.imageUrl && (
                              <img 
                                src={msg.imageUrl} 
                                alt="Uploaded attachment" 
                                className="max-w-xs rounded-lg mb-2.5 border border-slate-700/50 max-h-48 object-cover" 
                              />
                            )}
                            <p className="text-xs whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>

                            {/* TTS button on AI responses */}
                            {isBot && (
                              <button
                                id={`btn_tts_${msg.id}`}
                                onClick={() => handlePlayVoice(msg)}
                                className={`absolute -right-2 -bottom-2 p-1.5 rounded-full border transition-colors ${
                                  playingMsgId === msg.id 
                                    ? 'bg-amber-500 border-amber-600 text-slate-950 animate-bounce' 
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                                title="Đọc phát âm bằng giọng nói AI"
                              >
                                {isGeneratingTts && playingMsgId === msg.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                          
                          <div className={`flex items-center gap-1 text-[10px] text-slate-500 ${!isBot && 'justify-end'}`}>
                            <span>{msg.timestamp}</span>
                            <span>•</span>
                            <span>{isBot ? 'AI Chatbot' : 'Khách hàng'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Bot is thinking loader */}
                {isBotTyping && (
                  <div className="flex gap-3 max-w-[80%] mr-auto">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 animate-pulse">
                      AI
                    </div>
                    <div className="bg-slate-800 text-slate-300 p-4 rounded-2xl rounded-tl-none border border-slate-700/40">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                          Trợ lý AI đang soạn câu trả lời...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* CHAT INPUT AREA */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950/40">
                
                {/* ROLE SELECTOR FOR TESTING */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setChatSenderRole('user')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 ${
                      chatSenderRole === 'user'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/35'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    💬 Chat với tư cách: Khách hàng (Được AI trả lời tự động)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatSenderRole('model')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 ${
                      chatSenderRole === 'model'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/35'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    👤 Chat với tư cách: Cửa hàng (Gửi thủ công / Đồng bộ FB)
                  </button>
                </div>

                {/* ATTACHMENT PREVIEW IF ANY */}
                {attachedImage && (
                  <div className="mb-3 p-2 bg-slate-900 rounded-xl flex items-center justify-between border border-emerald-500/20">
                    <div className="flex items-center gap-2.5">
                      <img src={attachedImage} alt="Preview" className="w-10 h-10 rounded object-cover border border-slate-700" />
                      <div>
                        <p className="text-xs font-bold text-slate-300">Ảnh đã đính kèm</p>
                        <p className="text-[10px] text-slate-500 uppercase font-mono">Sẽ gửi cho Multimodal AI phân tích</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAttachedImage(null)}
                      className="p-1 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* CONTROL ACTION BAR IN INPUT CONTAINER */}
                <div className="flex items-center gap-2">
                  
                  {/* File input for Chat Image */}
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={chatImageRef}
                    onChange={handleChatImageChange}
                    className="hidden" 
                  />

                  <button
                    type="button"
                    onClick={() => chatImageRef.current?.click()}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-xl border border-slate-700/60 transition-colors shrink-0"
                    title="Đính kèm hình ảnh để AI phân tích"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Nhập tin nhắn phản hồi hoặc câu hỏi của bạn..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 text-slate-100"
                  />

                  <button
                    type="submit"
                    className="p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition-colors shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>💡 AI sẽ tự động phân tích từ khóa và áp dụng kịch bản trước khi gọi Gemini.</span>
                  <span>Nhấn nút đính kèm ảnh để trải nghiệm Multi-modal.</span>
                </div>
              </form>
            </div>
          </div>
          )
        )}

        {/* 3. AI CONFIGURATION & SCRIPT TUNING TAB */}
        {activeTab === 'config' && (
          <div className="space-y-6 md:space-y-8 animate-fadeIn">
            
            {/* 1. SUPPORT SCENARIO PRESETS MANAGER */}
            <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base md:text-lg font-bold tracking-tight text-slate-100 uppercase">KỊCH BẢN CHĂM SÓC KHÁCH HÀNG AI</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Chọn nhanh các mẫu kịch bản tư vấn phù hợp với ngữ cảnh cửa hàng hoặc tự sáng tạo kịch bản mới của riêng bạn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateScenarioModal(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-1 shrink-0"
                >
                  + Tạo kịch bản mới
                </button>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {scenarios.map((scenario) => {
                  const isActive = activeScenarioId === scenario.id;
                  return (
                    <div
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                        isActive
                          ? 'bg-slate-850/60 border-emerald-500/55'
                          : 'bg-slate-950/50 border-slate-850 hover:border-slate-800 hover:bg-slate-950'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Đang dùng
                        </div>
                      )}
                      <div>
                        <h4 className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {scenario.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-3">
                          {scenario.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-900/60 flex justify-between items-center text-[10px] text-slate-500 font-mono font-medium uppercase">
                        <span>Giọng: {scenario.voice} • Temp: {scenario.temperature}</span>
                        {scenario.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteScenario(scenario.id, e)}
                            className="text-rose-400 hover:text-rose-300 font-bold text-xs"
                            title="Xóa kịch bản tùy chỉnh"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create Scenario Modal overlay */}
            {showCreateScenarioModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black italic text-slate-200 uppercase tracking-wide">Tạo kịch bản chăm sóc khách hàng mới</h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateScenarioModal(false)}
                      className="text-slate-400 hover:text-slate-200 text-xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleCreateScenario} className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-400 block mb-1">Tên kịch bản</label>
                      <input
                        type="text"
                        required
                        value={newScenarioName}
                        onChange={(e) => setNewScenarioName(e.target.value)}
                        placeholder="Ví dụ: Tư vấn Dịch vụ Nâng cấp SSD / RAM"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-slate-400 block mb-1">Mô tả ngắn</label>
                      <input
                        type="text"
                        value={newScenarioDesc}
                        onChange={(e) => setNewScenarioDesc(e.target.value)}
                        placeholder="Mô tả tóm tắt mục tiêu của kịch bản..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-slate-400 block mb-1">Giọng nói TTS AI phù hợp</label>
                      <select
                        value={newScenarioVoice}
                        onChange={(e) => setNewScenarioVoice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none"
                      >
                        <option value="Zephyr">Zephyr (Thân thiện, Gợi cảm hứng)</option>
                        <option value="Kore">Kore (Rõ ràng, Kỹ thuật viên)</option>
                        <option value="Puck">Puck (Ấm áp, Đồng cảm)</option>
                        <option value="Charon">Charon (Doanh nhân, Đĩnh đạc)</option>
                        <option value="Fenrir">Fenrir (Trung thực, Nghiêm túc)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase text-slate-400 block mb-1">Độ sáng tạo (Temperature)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="1.0"
                          value={newScenarioTemp}
                          onChange={(e) => setNewScenarioTemp(parseFloat(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-slate-400 block mb-1">Chỉ thị hệ thống (System Prompt)</label>
                      <textarea
                        required
                        rows={6}
                        value={newScenarioPrompt}
                        onChange={(e) => setNewScenarioPrompt(e.target.value)}
                        placeholder="Hãy chỉ thị cách xưng hô, nhiệm vụ và các quy định của kịch bản..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateScenarioModal(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase text-slate-300 rounded-xl"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase rounded-xl transition-all"
                      >
                        Tạo và áp dụng
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {/* MAIN AI TUNING INTERFACE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              
              {/* SYSTEM PROMPT ADJUSTMENT */}
              <div className="lg:col-span-2 bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <h3 className="text-base font-bold text-slate-100 uppercase">CẤU HÌNH HƯỚNG DẪN AI CHATBOT (SYSTEM PROMPT)</h3>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded-full uppercase font-bold">Kịch bản hoạt động</span>
                  </div>
                  
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    Đây là chỉ thị lõi (System Instruction) gửi tới Gemini AI cho mỗi cuộc chat. 
                    Nó quy định cách xưng hô, tính cách thương hiệu, và giới hạn câu trả lời của trợ lý ảo chăm sóc khách hàng 24/7.
                  </p>

                  <textarea
                    id="input_config_system_prompt"
                    value={config.systemPrompt}
                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    rows={12}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono leading-relaxed text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-6 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Đã tối ưu hóa cho mô hình Gemini 3.5 Flash</span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setConfig({
                          ...config,
                          systemPrompt: INITIAL_CONFIG.systemPrompt
                        });
                        alert("Đã khôi phục chỉ dẫn kịch bản mặc định thành công! Nhấn Lưu cấu hình để ghi nhớ.");
                      }}
                      className="flex-1 sm:flex-none justify-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase text-slate-300 rounded-lg border border-slate-700 transition-all flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Khôi phục gốc
                    </button>
                    <button 
                      onClick={() => saveChatbotConfig()}
                      disabled={isSavingConfig}
                      className="flex-1 sm:flex-none justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </button>
                  </div>
                </div>
              </div>

              {/* CORE BEHAVIOR SETTINGS */}
              <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase mb-1">Thông số Vận Hành</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Điều chỉnh phản ứng cơ bản của AI.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Tên đại diện Trợ lý</label>
                    <input 
                      type="text" 
                      value={config.botName}
                      onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Số điện thoại Zalo Khẩn Cấp</label>
                    <input 
                      type="text" 
                      value={config.zaloNumber}
                      onChange={(e) => setConfig({ ...config, zaloNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Tên Hiển Thị Zalo</label>
                    <input 
                      type="text" 
                      value={config.zaloName}
                      onChange={(e) => setConfig({ ...config, zaloName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Độ trễ phản hồi (Giây)</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="0.5" 
                        max="5" 
                        step="0.5"
                        value={config.autoReplyDelay}
                        onChange={(e) => setConfig({ ...config, autoReplyDelay: parseFloat(e.target.value) })}
                        className="flex-1 accent-emerald-500"
                      />
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-2 py-1 rounded">
                        {config.autoReplyDelay}s
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Từ khóa chuyển tiếp khẩn cấp (Zalo)</label>
                    <p className="text-[10px] text-slate-500 mb-1.5">Khi tin nhắn của khách chứa từ khóa này, bot sẽ ưu tiên hiển thị Hotline.</p>
                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      {config.fallbackKeywords.map((kw, idx) => (
                        <span key={idx} className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                          {kw}
                          <button 
                            type="button"
                            onClick={() => {
                              setConfig({
                                ...config,
                                fallbackKeywords: config.fallbackKeywords.filter((_, i) => i !== idx)
                              });
                            }}
                            className="text-rose-400 hover:text-rose-300 text-[9px] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const kw = prompt("Nhập từ khóa khẩn cấp mới:");
                          if (kw && kw.trim()) {
                            setConfig({
                              ...config,
                              fallbackKeywords: [...config.fallbackKeywords, kw.trim().toLowerCase()]
                            });
                          }
                        }}
                        className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded hover:bg-indigo-500/30"
                      >
                        + Thêm
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveChatbotConfig()}
                  disabled={isSavingConfig}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình thông số'}
                </button>

                <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/10">
                  <p className="text-[10px] font-bold uppercase text-indigo-400 flex items-center gap-1 mb-1">
                    <Check className="w-3.5 h-3.5" /> Hệ Thống Đã Kích Hoạt Zalo
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Bất kỳ khi nào khách hàng nhập từ khóa nhạy cảm, chatbot sẽ tự động gửi số <b>{config.zaloNumber}</b> để kết nối gọi điện ngay.
                  </p>
                </div>
              </div>
            </div>

            {/* MANAGE INSTANT SCRIPT / FAQS */}
            <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-base md:text-lg font-bold tracking-tight text-slate-100 uppercase">Kho dữ liệu kịch bản FAQ nội bộ</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Các câu hỏi đáp nhanh được huấn luyện trực tiếp để chatbot lấy dữ liệu trả lời chính xác, tránh việc AI bị nhầm lẫn thông tin.
                  </p>
                </div>
              </div>

              {/* FAQ LIST */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {faqs.map(faq => (
                  <div key={faq.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 relative flex flex-col justify-between">
                    <button 
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Xóa kịch bản"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">FAQ SCRIPT</span>
                      <h4 className="text-xs font-bold text-slate-200 mt-2 pr-6">{faq.question}</h4>
                      <p className="text-xs text-slate-400 mt-2 whitespace-pre-wrap leading-relaxed italic">
                        "{faq.answer}"
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-900/80 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Nhận diện tự động
                    </div>
                  </div>
                ))}
              </div>

              {/* CREATE SCRIPT FORM */}
              <form onSubmit={handleAddFaq} className="bg-slate-950 p-6 rounded-2xl border border-slate-850">
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider mb-4">Thêm câu hỏi kịch bản mới</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Câu hỏi khách thường gặp</label>
                    <input 
                      type="text" 
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      placeholder="Ví dụ: Shop có ship tỉnh lẻ không?"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Nội dung trả lời mẫu (AI sẽ tham khảo)</label>
                    <input 
                      type="text" 
                      value={newFaqAnswer}
                      onChange={(e) => setNewFaqAnswer(e.target.value)}
                      placeholder="Ví dụ: Dạ, shop có ship toàn quốc đồng giá 25k ạ..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> THÊM VÀO KHO KỊCH BẢN
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 5. FACEBOOK CONNECTION & CONVERSATION MEMORY SETTINGS */}
        {activeTab === 'facebook' && (
          <div className="space-y-6 md:space-y-8 animate-fadeIn">
            
            {/* TOP HEADER */}
            <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-100 uppercase tracking-tight flex items-center gap-2">
                    🔑 Cấu hình Kết nối Facebook & Bộ nhớ Hội thoại
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Thiết lập kết nối an toàn với Fanpage của bạn, kiểm tra quyền hạn Webhook, Token và điều chỉnh dung lượng bộ nhớ đệm cho AI Chatbot.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Trạng thái hệ thống:</span>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Đang hoạt động
                  </span>
                </div>
              </div>
            </div>

            {/* TUNNEL URL ALERT BOX FOR BYPASSING COOKIES */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between animate-fadeIn">
              <div className="space-y-2 flex-1 w-full">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase">
                  <span className="text-base">⚠️</span>
                  <span>LƯU Ý QUAN TRỌNG KHI LIÊN KẾT WEBHOOK FACEBOOK</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  Do hệ thống bảo mật của Google AI Studio tự động chặn và yêu cầu xác thực cookie đối với đường link chính của ứng dụng (<code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300 font-bold font-mono text-[11px] select-all">{getPublicWebhookUrl()}</code>), máy chủ của Facebook sẽ bị chặn 302 và <b>không thể gửi tín hiệu xác minh</b> thành công.
                </p>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-2.5">
                  <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    🚀 <span className="uppercase tracking-wider text-[10px]">ĐÃ TỰ ĐỘNG KHỞI TẠO ĐƯỜNG TRUYỀN TUNNEL CÔNG KHAI (BYPASS COOKIE):</span>
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={tunnelUrl || "Đang khởi tạo đường truyền Tunnel, vui lòng đợi vài giây..."} 
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono font-bold select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!tunnelUrl}
                      onClick={() => {
                        if (tunnelUrl) {
                          navigator.clipboard.writeText(tunnelUrl);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }
                      }}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-lg transition duration-150 flex items-center justify-center gap-1 shrink-0"
                    >
                      {copiedUrl ? "Đã sao chép!" : "Sao chép Link"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    👉 Hãy sao chép <b>URL Tunnel công khai</b> màu xanh ở trên và dán vào ô <b>"URL gọi lại" (Callback URL)</b> trên Facebook Developer Portal để xác thực thành công 100%!
                  </p>
                  <div className="pt-2 border-t border-slate-900 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                    <span>🔑 Mã xác minh (Verify Token): <code className="bg-slate-900 px-1.5 py-0.5 rounded text-sky-400 font-mono font-bold select-all">MayTinhMuiNeWebhookVerifySecret</code></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              
              {/* FACEBOOK & GEMINI API CONNECTION CARD */}
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-400">
                      Kết Nối Trực Tiếp Facebook & AI Gemini
                    </h4>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded font-bold">KẾT NỐI ACTIVE</span>
                  </div>

                  {/* REAL-WORLD CONFIGURATION STATUS */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* GEMINI KEY CARD */}
                      <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. GEMINI_API_KEY</span>
                          {realStatus?.geminiConfigured ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">Đã cấu hình</span>
                          ) : (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase">Chưa cấu hình</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-200">
                          {realStatus?.geminiConfigured ? "🤖 Trí tuệ nhân tạo Gemini sẵn sàng!" : "⚠️ Chưa cấu hình khóa AI Gemini."}
                        </p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Sử dụng để phân tích tin nhắn khách hàng và tự động lên ý tưởng/viết bài đăng SEO.
                        </p>
                      </div>

                      {/* FACEBOOK CONNECTION STATUS CARD */}
                      <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">2. FACEBOOK PAGE STATE</span>
                          {realStatus?.facebookTokenConfigured ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">ĐÃ KẾT NỐI</span>
                          ) : (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase">CHƯA LIÊN KẾT</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-200">
                          {realStatus?.facebookTokenConfigured ? "🟢 Đang kết nối Facebook Page thành công" : "🔴 Chưa chọn Page hoạt động"}
                        </p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Nhận sự kiện tin nhắn qua Webhook và tự động phản hồi trực tiếp qua Facebook Graph API.
                        </p>
                      </div>
                    </div>

                    {/* FACEBOOK AUTHENTICATION & PAGE SELECTION SECTION */}
                    <div className="p-4 bg-gradient-to-br from-indigo-950/10 to-slate-900/40 rounded-2xl border border-indigo-500/10 space-y-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h5 className="text-xs font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${realStatus?.facebookTokenConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                            Liên Kết Tài Khoản Facebook Với Hệ Thống
                          </h5>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Vui lòng nhấn nút đăng nhập bên dưới để kết nối tài khoản Facebook và cấp quyền quản lý các Trang Fanpage của bạn cho chatbot.
                          </p>
                        </div>
                        <button
                          onClick={handleConnectFacebook}
                          disabled={isConnectingFb}
                          className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition duration-150 shrink-0 flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
                        >
                          {isConnectingFb ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang kết nối...</span>
                            </>
                          ) : (
                            <>
                              <Facebook className="w-4 h-4 fill-current" />
                              <span>Đăng Nhập Facebook</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* DISPLAY LIST OF DETECTED / CONNECTED PAGES */}
                      <div className="pt-4 border-t border-slate-850 space-y-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Danh sách Trang Fanpage phát hiện được ({connectedPages.length}):</p>
                        
                        {connectedPages.length === 0 ? (
                          <div className="p-4 bg-slate-950 rounded-xl text-center border border-slate-850">
                            <p className="text-xs text-slate-500">Chưa có Trang Facebook nào được liên kết. Vui lòng nhấn nút Đăng Nhập Facebook ở trên.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {connectedPages.map((page) => {
                              const isActive = page.id === selectedPageId;
                              return (
                                <div 
                                  key={page.id} 
                                  className={`p-3.5 rounded-xl border transition-all ${
                                    isActive 
                                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                                      : 'bg-slate-950/50 border-slate-850 hover:border-slate-700 text-slate-300'
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="truncate">
                                      <p className="text-xs font-bold text-slate-100 truncate">{page.name}</p>
                                      <p className="text-[9px] text-slate-500 truncate mt-0.5">ID: {page.id}</p>
                                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Phân loại: {page.category}</p>
                                    </div>
                                    {isActive ? (
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase shrink-0">ĐANG HOẠT ĐỘNG</span>
                                    ) : (
                                      <button
                                        onClick={() => handleSelectPage(page.id)}
                                        className="text-[8px] bg-slate-800 hover:bg-slate-750 text-slate-350 px-2 py-0.5 rounded font-black uppercase shrink-0 transition"
                                      >
                                        Kích hoạt
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRAPH API WEBHOOKS LOGS (REALTIME DYNAMIC SERVER-SIDE) */}
                <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Trình nhật ký Webhook Facebook (Kết nối máy chủ thực)</h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  </div>
                  
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1.5 overflow-x-auto max-h-56 overflow-y-auto">
                    {serverLogs.length === 0 ? (
                      <p className="text-slate-500">Chưa có log webhook nào được ghi nhận. Hệ thống đang lắng nghe...</p>
                    ) : (
                      serverLogs.map((log: any) => {
                        let colorClass = "text-emerald-400";
                        if (log.type === "GET_VERIFY") colorClass = "text-sky-400 font-bold";
                        if (log.type === "POST_RECEIVED") colorClass = "text-indigo-400";
                        if (log.type === "BOT_REPLIED") colorClass = "text-emerald-400 font-semibold";
                        if (log.type === "MANUAL_REPLY") colorClass = "text-amber-400 font-semibold";
                        if (log.type === "ERROR") colorClass = "text-rose-400 font-bold animate-pulse";

                        return (
                          <div key={log.id} className={`${colorClass} break-all leading-relaxed`}>
                            <span className="text-slate-500 font-normal">[{log.timestamp}]</span> <span className="bg-slate-900 px-1 py-0.2 rounded border border-slate-800 text-[10px] font-bold mr-1">{log.type}</span> {log.message}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* CONVERSATION MEMORY SLIDER & BUFFER DIAGRAM */}
              <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wide text-slate-300">
                    Bộ Nhớ Hội Thoại AI (Conversational Memory)
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Cấu hình số lượng tin nhắn tối đa gửi lên Gemini API trong mỗi lượt chat để AI hiểu đúng mạch thảo luận trước đó.
                  </p>
                </div>

                {/* SLIDER CONTROLLER */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-850 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wide">Số tin gần nhất:</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">{conversationMemoryLimit} tin</span>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={conversationMemoryLimit}
                    onChange={(e) => setConversationMemoryLimit(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />

                  <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                    <span>5 tin (Tiết kiệm Token)</span>
                    <span>30 tin (Cực kỳ chính xác)</span>
                  </div>

                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/10 rounded-lg text-[11px] text-slate-400 leading-relaxed">
                    💡 <b>Mạch hoạt động:</b> Khi khách gửi tin, AI sẽ tự động truy vấn ngược dòng thời gian chính xác <b>{conversationMemoryLimit} tin nhắn gần nhất</b> để lấy bối cảnh trước khi suy luận ra câu trả lời. Tránh việc AI bị "quên" thông tin khách đã cung cấp lúc trước.
                  </div>
                </div>

                {/* VISUAL DIAGRAM */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Minh họa cửa sổ trượt bộ nhớ:</p>
                  
                  <div className="space-y-1.5 p-3.5 bg-slate-950 rounded-2xl border border-slate-850 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase pb-1 border-b border-slate-850">
                      <span>Lịch sử tin nhắn</span>
                      <span>Trạng thái lưu trữ</span>
                    </div>

                    <div className="flex justify-between items-center py-1 opacity-40">
                      <span className="text-slate-400 truncate max-w-[150px]">Tin số -12: "Shop ở đâu thế?"</span>
                      <span className="text-[9px] text-slate-500 uppercase">Đã cắt bỏ</span>
                    </div>

                    <div className="flex justify-between items-center py-1 opacity-40">
                      <span className="text-slate-400 truncate max-w-[150px]">Tin số -11: "Có mẫu lanh đỏ không?"</span>
                      <span className="text-[9px] text-slate-500 uppercase">Đã cắt bỏ</span>
                    </div>

                    <div className="flex justify-between items-center py-1 text-emerald-400 font-bold">
                      <span className="truncate max-w-[150px]">✔️ Tin số -10: "Màn hình này giá bao nhiêu?"</span>
                      <span className="text-[9px] bg-emerald-500/10 px-1.5 py-0.2 rounded uppercase">Sẵn sàng ({conversationMemoryLimit})</span>
                    </div>

                    <div className="flex justify-between items-center py-1 text-slate-300">
                      <span className="truncate max-w-[150px]">✔️ Tin số -9: "Dạ giá 800k ạ"</span>
                      <span className="text-[9px] text-slate-500 uppercase">Trong bộ nhớ</span>
                    </div>

                    <div className="flex justify-between items-center py-1 text-slate-300">
                      <span className="truncate max-w-[150px]">✔️ Tin số -8: "Có hỗ trợ gọi Zalo ko"</span>
                      <span className="text-[9px] text-slate-500 uppercase">Trong bộ nhớ</span>
                    </div>

                    <div className="pt-2 border-t border-slate-850 text-[10px] text-center text-slate-400">
                      <i>Cửa sổ trượt tự động dịch chuyển khi có tin mới...</i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 4. POST GENERATION & SEO WORKSPACE */}
        {activeTab === 'posts' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* WORKSPACE DIVIDED INTO GENERATOR & PREVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              
              {/* CREATOR PANEL WITH AI LANGUAGE ASSISTANT */}
              <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <h3 className="text-base font-bold text-slate-100 uppercase">
                      AI Sáng Tạo Nội Dung Chuẩn SEO
                    </h3>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full uppercase font-bold font-mono">
                      Natural Language V2
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                    Nhập ý tưởng thô của bạn bằng ngôn ngữ tự nhiên. AI của hệ thống sẽ tự động chuyển hóa thành một bài đăng
                    Facebook cực kỳ thu hút, đề xuất tiêu đề giật gân, tự động chèn hashtag và đề xuất bộ từ khóa tối ưu hóa SEO bài đăng.
                  </p>

                  {/* PROMPT INPUT */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider block mb-1">
                        Ý tưởng thô / Chủ đề mong muốn
                      </label>
                      <textarea
                        value={postPrompt}
                        onChange={(e) => setPostPrompt(e.target.value)}
                        placeholder="Ví dụ: giới thiệu mẫu váy lanh mùa hè siêu mát, khuyến mãi giảm 10% khi mua tại cửa hàng..."
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider block mb-1">
                          Tông giọng bài đăng
                        </label>
                        <select
                          value={postTone}
                          onChange={(e) => setPostTone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none"
                        >
                          <option value="Hào hứng & Thu hút">🔥 Hào hứng & Thu hút</option>
                          <option value="Chuyên nghiệp & Tin cậy">💼 Chuyên nghiệp & Tin cậy</option>
                          <option value="Tối giản & Tinh tế">🌿 Tối giản & Tinh tế</option>
                          <option value="Drama & Giật gân">⚡ Drama & Giật gân</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider block mb-1">
                          Từ khóa SEO bổ sung (nếu có)
                        </label>
                        <input
                          type="text"
                          value={postKeywords}
                          onChange={(e) => setPostKeywords(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* DYNAMIC IMAGE EFFECT SECTION */}
                    <div className="pt-4 border-t border-slate-800/80">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                          Hình Ảnh Đi Kèm & Hiệu Ứng Ảnh Động (Auto-FX)
                        </label>
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.2 rounded font-bold">GIÚP BÀI ĐĂNG SINH ĐỘNG</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Image file trigger */}
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <span className="text-[10px] text-slate-500 block font-bold">NGUỒN HÌNH ẢNH</span>
                            <span className="text-xs text-slate-300 truncate block">Ảnh đang chọn hoặc tải lên</span>
                          </div>
                          <div>
                            <input 
                              type="file" 
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={handlePostImageChange}
                              className="hidden" 
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase rounded-lg border border-slate-700 transition-colors"
                            >
                              Tải ảnh lên
                            </button>
                          </div>
                        </div>

                        {/* Effects selection */}
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-850">
                          <span className="text-[10px] text-slate-500 block font-bold mb-1">CHỌN HIỆU ỨNG ẢNH ĐỘNG</span>
                          <select
                            value={postImageEffect}
                            onChange={(e) => setPostImageEffect(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-amber-400 focus:outline-none"
                          >
                            <option value="none">Không hiệu ứng (Tĩnh)</option>
                            <option value="glow">✨ Glow Pulsing (Hào quang rực rỡ)</option>
                            <option value="sparkle">⭐ Star Sparkles (Hạt lấp lánh bay)</option>
                            <option value="retro">📺 Retro VHS (Băng nhiễu neon)</option>
                            <option value="zoom">🔍 Dynamic Zoom (Thu phóng chuyển động)</option>
                            <option value="banner">🌿 Natural Eco Banner (Khung sinh thái)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* SẢN PHẨM ĐÍNH KÈM (MỚI) */}
                    <div className="pt-4 border-t border-slate-800/80">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                          Sản phẩm đính kèm bài viết (AI tự tra cứu)
                        </label>
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg">
                          <span className="text-[10px] text-slate-400 uppercase font-black">BÁN SẢN PHẨM:</span>
                          <button
                            type="button"
                            onClick={() => setHasProduct(!hasProduct)}
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${
                              hasProduct ? "bg-emerald-500" : "bg-slate-800"
                            }`}
                          >
                            <div
                              className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-150 ${
                                hasProduct ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {hasProduct && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950 rounded-2xl border border-emerald-500/20 animate-scaleUp">
                          <div>
                            <label className="text-[10px] text-slate-500 block font-bold mb-1">TÊN SẢN PHẨM BÁN</label>
                            <input
                              type="text"
                              value={productName}
                              onChange={(e) => setProductName(e.target.value)}
                              placeholder="Ví dụ: Màn hình máy tính G-Net 24 inch"
                              className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block font-bold mb-1">GIÁ BÁN (VND)</label>
                            <input
                              type="text"
                              value={productPrice}
                              onChange={(e) => setProductPrice(e.target.value)}
                              placeholder="Ví dụ: 800.000 VNĐ hoặc 800k"
                              className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800/80 mt-6">
                  <button
                    onClick={handleGeneratePostWithAI}
                    disabled={isGeneratingPost || !postPrompt.trim()}
                    className="w-full py-3 bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingPost ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI đang biên soạn và tối ưu từ khóa SEO...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>Sáng tạo bài đăng với AI ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* POST ARCHIVE & COMPILATION VIEW */}
              <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase mb-4">
                    Kết Quả & Xem Trước Bài Đăng
                  </h3>

                  {generatedResult ? (
                    <div className="space-y-4 animate-scaleUp">
                      
                      {/* SIMULATED FACEBOOK FEED LAYOUT */}
                      <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4 relative">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">
                            ES
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-100 uppercase">EcoStyle Việt Nam</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Đang xem trước bài đăng</p>
                          </div>
                        </div>

                        {/* Title & Body */}
                        <div className="space-y-2 text-xs">
                          <p className="font-bold text-slate-200">{generatedResult.title}</p>
                          <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">{generatedResult.content}</p>
                          <p className="text-emerald-400 font-bold font-mono">
                            {generatedResult.hashtags.join(' ')}
                          </p>
                        </div>

                        {/* RENDERED IMAGE WITH SELECTED EFFECT */}
                        {postImage && (
                          <div className="mt-4 rounded-xl overflow-hidden relative border border-slate-800/80 bg-slate-900 group">
                            
                            {/* DYNAMIC RENDER OF CSS EFFECT CLASSES */}
                            <img 
                              src={postImage} 
                              alt="Post graphic" 
                              className={`w-full h-56 object-cover transition-all duration-1000 ${
                                postImageEffect === 'glow' ? 'glow-active' : ''
                              } ${
                                postImageEffect === 'zoom' ? 'animate-pulse scale-102' : ''
                              }`} 
                            />

                            {/* Glow effect overlay */}
                            {postImageEffect === 'glow' && (
                              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent pointer-events-none mix-blend-overlay"></div>
                            )}

                            {/* Sparkles particle effect overlay */}
                            {postImageEffect === 'sparkle' && (
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="absolute top-4 left-6 animate-ping text-yellow-300">⭐</div>
                                <div className="absolute bottom-6 right-12 animate-bounce text-amber-400 text-lg">✨</div>
                                <div className="absolute top-12 right-6 animate-pulse text-yellow-300 text-xs">⭐</div>
                                <div className="absolute bottom-10 left-10 animate-pulse text-yellow-200">✨</div>
                              </div>
                            )}

                            {/* Retro glitch effect scanlines overlay */}
                            {postImageEffect === 'retro' && (
                              <div className="absolute inset-0 pointer-events-none border-2 border-pink-500/30 overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent bg-[length:100%_4px]"></div>
                                <div className="absolute top-2 left-2 bg-pink-600 text-white font-mono text-[9px] px-1 rounded animate-pulse">REC</div>
                              </div>
                            )}

                            {/* Eco Banner overlay */}
                            {postImageEffect === 'banner' && (
                              <div className="absolute bottom-0 inset-x-0 bg-slate-900/95 border-t border-emerald-500/30 p-2.5 flex justify-between items-center">
                                <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">🌿 ECO-CONSCIOUS CAMPAIGN</span>
                                <span className="text-[9px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black font-mono">100% ORGANIC</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SEO ANALYSIS OUTPUT BOARD */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-1.5 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                            Phân tích Từ khóa SEO Tự động
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed italic">
                          "{generatedResult.seoAnalysis}"
                        </p>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {generatedResult.seoKeywords.map((kw, i) => (
                            <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                              🔑 {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="h-80 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 text-center p-6">
                      <ImageIcon className="w-12 h-12 text-slate-700 mb-3" />
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">Chưa có bản xem trước bài viết</p>
                      <p className="text-[11px] text-slate-600 mt-1 max-w-xs leading-relaxed">
                        Hãy nhập ý tưởng của bạn ở ô bên trái rồi click vào "Sáng tạo bài đăng" để kích hoạt mô hình ngôn ngữ tự nhiên.
                      </p>
                    </div>
                  )}
                </div>

                {generatedResult && (
                  <div className="pt-6 border-t border-slate-800/80 mt-6 flex gap-3">
                    <button
                      onClick={() => setGeneratedResult(null)}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all"
                    >
                      Bỏ bài viết
                    </button>
                    <button
                      id="btn_publish_post"
                      onClick={handlePublishPost}
                      disabled={isPublishingToFb}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black text-xs uppercase rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      {isPublishingToFb ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> ĐANG ĐĂNG...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> ĐĂNG LÊN HOẠT ĐỘNG
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* POSTS SEARCH & PREVIOUS FEED ARCHIVE */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black italic uppercase text-slate-200">
                    Lịch sử và Nhật ký Bài đăng Fanpage
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quản lý các bài đã được tạo ra từ hệ thống tự động, chỉnh sửa hiệu ứng hoặc xem lượng tiếp cận thực tế.
                  </p>
                </div>

                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={postSearchQuery}
                    onChange={(e) => setPostSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm nội dung, từ khóa SEO..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* FEED CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPosts.length === 0 ? (
                  <div className="col-span-2 text-center py-12 border border-slate-850 bg-slate-950/20 rounded-2xl">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Không tìm thấy bài viết nào khớp</p>
                  </div>
                ) : (
                  filteredPosts.map(post => (
                    <div key={post.id} className="bg-slate-950 rounded-2xl border border-slate-850 p-5 flex flex-col justify-between">
                      <div>
                        {/* Meta header */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
                            📆 Đăng lúc: {post.createdAt}
                          </span>
                          <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase">
                            Effect: {post.imageEffect || 'none'}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-200 leading-snug mb-2">{post.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed mb-4 whitespace-pre-wrap">
                          {post.content}
                        </p>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {post.seoKeywords.map((kw, idx) => (
                            <span key={idx} className="bg-slate-900 border border-slate-850 text-slate-400 text-[10px] px-2 py-0.5 rounded">
                              🔑 {kw}
                            </span>
                          ))}
                        </div>

                        {/* Hiển thị sản phẩm đính kèm nếu có */}
                        {post.product && (
                          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 text-lg">🛍️</span>
                              <div>
                                <p className="text-xs font-black text-slate-200">{post.product.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sản phẩm đính kèm</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-emerald-400 font-mono">{post.product.price}</p>
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-black font-mono">Đang bán</span>
                            </div>
                          </div>
                        )}

                        {/* Rendering matching thumbnail if exists */}
                        {post.imageUrl && (
                          <div className="rounded-xl overflow-hidden h-40 mb-4 relative bg-slate-900">
                            <img 
                              src={post.imageUrl} 
                              alt="Thumbnail" 
                              className={`w-full h-full object-cover ${
                                post.imageEffect === 'glow' ? 'glow-active' : ''
                              } ${
                                post.imageEffect === 'zoom' ? 'animate-pulse' : ''
                              }`} 
                            />
                            {post.imageEffect === 'sparkle' && (
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <span className="absolute top-2 left-4 animate-ping text-yellow-300">⭐</span>
                                <span className="absolute bottom-4 right-8 animate-bounce text-amber-300 text-lg">✨</span>
                              </div>
                            )}
                            {post.imageEffect === 'retro' && (
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent bg-[length:100%_4px] pointer-events-none"></div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* POST SIMULATED ENGAGEMENT STATS */}
                      <div className="pt-4 border-t border-slate-900 flex justify-between items-center">
                        <div className="flex gap-4">
                          <button 
                            id={`btn_like_post_${post.id}`}
                            onClick={() => handleLikePost(post.id)}
                            className="flex items-center gap-1 text-slate-500 hover:text-rose-500 transition-colors"
                          >
                            <Heart className="w-4 h-4" />
                            <span className="text-xs font-bold font-mono">{post.likes}</span>
                          </button>
                          <span className="flex items-center gap-1 text-slate-500">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs font-bold font-mono">{post.comments}</span>
                          </span>
                        </div>

                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded font-black uppercase">
                          SẴN SÀNG TÌM KIẾM KHÁCH HÀNG
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* FOOTER INFO BAR */}
        <footer className="mt-12 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold text-slate-500 border-t border-slate-800 pt-6 uppercase tracking-[0.2em] gap-2">
          <div>Hệ thống quản trị và chăm sóc khách hàng tự động v2.5.0</div>
          <div className="flex gap-6">
            <span className="text-emerald-500">Kích hoạt: Gemini 3.5 & Multimodal</span>
            <span>CPU: 12%</span>
            <span>Băng thông: Cực kỳ ổn định</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
