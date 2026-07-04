export interface FAQScenario {
  id: string;
  question: string;
  answer: string;
}

export interface ChatbotConfig {
  botName: string;
  systemPrompt: string;
  zaloNumber: string;
  zaloName: string;
  fallbackKeywords: string[];
  creativity: number; // 0 to 1
  autoReplyDelay: number; // in seconds
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  imageUrl?: string;
  timestamp: string;
  isAudio?: boolean;
}

export interface CustomerThread {
  id: string;
  customerName: string;
  customerAvatar: string;
  lastMessage: string;
  unread: boolean;
  messages: Message[];
}

export interface FacebookPost {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  seoKeywords: string[];
  imageUrl?: string;
  imageEffect?: string; // 'none' | 'sparkle' | 'retro' | 'glow' | 'zoom' | 'banner'
  createdAt: string;
  status: 'published' | 'scheduled';
  likes: number;
  comments: number;
  shares: number;
  product?: {
    name: string;
    price: string;
  };
}
