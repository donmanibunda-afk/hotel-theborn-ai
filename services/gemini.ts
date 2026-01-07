import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

let client: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let userProvidedKey: string | null = null;

export const setApiKey = (key: string) => {
  userProvidedKey = key;
  initializeGemini();
};

export const initializeGemini = () => {
  const key = userProvidedKey || process.env.API_KEY;
  if (key) {
    client = new GoogleGenAI({ apiKey: key });
  }
};

export const startChatSession = async (additionalContext?: string): Promise<Chat> => {
  // Ensure client is initialized with the latest key
  initializeGemini();
  
  if (!client) {
    throw new Error("Gemini Client could not be initialized. Please provide an API Key.");
  }

  let finalInstruction = SYSTEM_INSTRUCTION;
  if (additionalContext) {
    finalInstruction += `\n\n=== 사용자가 업로드한 추가 분석 데이터 ===\n${additionalContext}\n=====================================\n위 데이터를 최우선으로 참고하여 분석하세요.`;
  }

  chatSession = client.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: finalInstruction,
      temperature: 0.7,
    },
  });
  return chatSession;
};

export const getChatSession = async (): Promise<Chat> => {
  if (!chatSession) {
    return await startChatSession();
  }
  return chatSession;
};

export const sendMessageStream = async (message: string | any[]) => {
  const chat = await getChatSession();
  try {
    const result = await chat.sendMessageStream({ message });
    return result;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};