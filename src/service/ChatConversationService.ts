import { MqttService } from "./MqttService";

export interface ChatMessage {
  from: string;
  text: string;
  timestamp: string;
  messageId: string;
  topic: string; // ✅ Adiciona o tópico na mensagem
}

export interface Conversation {
  topic: string;
  messages: ChatMessage[];
  unreadCount: number;
  lastMessage: ChatMessage | null;
}

export class ChatConversationService {
  private mqttService: MqttService;
  private userId: string;

  // ✅ Estrutura SIMPLES: Map de conversas
  private conversations: Map<string, Conversation> = new Map();

  // ✅ Apenas UM callback global (opcional para notificações)
  private onNewMessageCallback?: (message: ChatMessage) => void;

  constructor(mqttService: MqttService) {
    this.mqttService = mqttService;
    this.userId = mqttService.getClientId();
  }

  /**
   * ✅ SIMPLES: Apenas inscreve no tópico
   */
  joinChat(topic: string): void {
    if (this.conversations.has(topic)) {
      console.log(`Já está em: ${topic}`);
      return;
    }

    // Cria conversa
    this.conversations.set(topic, {
      topic,
      messages: [],
      unreadCount: 0,
      lastMessage: null,
    });

    // Inscreve no MQTT
    this.mqttService.subscribe(topic, (t, payload) => {
      this.handleMessage(t, payload);
    });

    console.log(`💬 Entrou em: ${topic}`);
  }

  /**
   * ✅ Processa mensagem e adiciona na conversa correta
   */
  private handleMessage(topic: string, payload: string): void {
    const conversation = this.conversations.get(topic);
    if (!conversation) return;

    const message: ChatMessage = {
      ...JSON.parse(payload),
      topic, // ✅ Adiciona o tópico
    };

    // Adiciona na conversa
    conversation.messages.push(message);
    conversation.lastMessage = message;

    // Incrementa não lidas (se não for sua mensagem)
    if (message.from !== this.userId) {
      conversation.unreadCount++;
    }

    // ✅ Callback opcional (para notificações em tempo real)
    if (this.onNewMessageCallback && message.from !== this.userId) {
      this.onNewMessageCallback(message);
    }

    console.log(`📨 [${topic}] ${message.from}: ${message.text}`);
  }

  /**
   * ✅ Envia mensagem para tópico
   */
  sendMessage(topic: string, text: string): void {
    if (!this.conversations.has(topic)) {
      console.error(`Não está em: ${topic}`);
    }

    const messageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const message: ChatMessage = {
      from: this.userId,
      text,
      timestamp: new Date().toISOString(),
      messageId,
      topic,
    };

    this.mqttService.publish(topic, message);

    // Adiciona localmente
    const conversation = this.conversations.get(topic)!;
    conversation.messages.push(message);
    conversation.lastMessage = message;
  }

  /**
   * ✅ Pega mensagens de uma conversa
   */
  getMessages(topic: string): ChatMessage[] {
    return this.conversations.get(topic)?.messages || [];
  }

  /**
   * ✅ Pega todas as conversas
   */
  getConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  /**
   * ✅ Pega uma conversa específica
   */
  getConversation(topic: string): Conversation | null {
    return this.conversations.get(topic) || null;
  }

  /**
   * ✅ Marca mensagens como lidas
   */
  markAsRead(topic: string): void {
    const conversation = this.conversations.get(topic);
    if (conversation) {
      conversation.unreadCount = 0;
    }
  }

  /**
   * ✅ Callback global para notificações (opcional)
   */
  onNewMessage(callback: (message: ChatMessage) => void): void {
    this.onNewMessageCallback = callback;
  }

  /**
   * ✅ Sai de uma conversa
   */
  leaveChat(topic: string): void {
    if (!this.conversations.has(topic)) return;

    this.mqttService.unsubscribe(topic);
    this.conversations.delete(topic);

    console.log(`👋 Saiu de: ${topic}`);
  }

  /**
   * ✅ PERSISTÊNCIA: Salva estado
   */
  saveState(): void {
    const state = {
      conversations: Array.from(this.conversations.entries()),
    };
    localStorage.setItem("chatState", JSON.stringify(state));
    console.log("💾 Estado salvo");
  }

  /**
   * ✅ PERSISTÊNCIA: Restaura estado
   */
  restoreState(): void {
    const saved = localStorage.getItem("chatState");
    if (!saved) return;

    const state = JSON.parse(saved);

    // Restaura conversas
    state.conversations.forEach(
      ([topic, conversation]: [string, Conversation]) => {
        this.conversations.set(topic, conversation);

        // Re-inscreve no MQTT
        this.mqttService.subscribe(topic, (t, payload) => {
          this.handleMessage(t, payload);
        });
      }
    );

    console.log(`✅ Restauradas ${this.conversations.size} conversas`);
  }
}
