import type { MqttService } from "./MqttService";

// ============================================================================
// MENSAGENS DE CONTROLE (Classificação de HAndlers)
// ============================================================================

export interface InviteRequest {
  type: "invite_received";
  from: string;
  requestId: string;
  timestamp: string;
}

export interface InviteAccept {
  type: "invite_accepted";
  from: string;
  to: string;
  chatTopic: string;
  requestId: string;
  timestamp: string;
}

export interface InviteReject {
  type: "invite_rejected";
  from: string;
  to: string;
  requestId: string;
  timestamp: string;
}

export interface ChatMessage {
  type: "message";
  from: string;
  content: string;
  messageId: string;
  chatTopic: string;
  timestamp: string;
}

export type ControlMessage = InviteRequest | InviteAccept | InviteReject;

// ============================================================================
// EVENTOS DO SERVIÇO
// ============================================================================

export interface InviteReceivedEvent {
  type: "invite_received";
  from: string;
  requestId: string;
  timestamp: string;
}

export interface InviteAcceptedEvent {
  type: "invite_accepted";
  acceptedBy: string;
  chatTopic: string;
  requestId: string;
  timestamp: string;
}

export interface InviteRejectedEvent {
  type: "invite_rejected";
  rejectedBy: string;
  requestId: string;
  timestamp: string;
}

export interface MessageReceivedEvent {
  type: "message_received";
  from: string;
  content: string;
  messageId: string;
  chatTopic: string;
  timestamp: string;
}

export interface ChatSubscribedEvent {
  type: "chat_subscribed";
  chatTopic: string;
  timestamp: string;
}

export interface PresenceUpdateEvent {
  type: "presence_update";
  userId: string;
  status: "online" | "offline";
  timestamp: string;
}

export interface LoadConversations {
  type: "load_conversation";
  conversations: {
    userId: string;
    topic: string;
    chatIndividual: boolean;
    timestamp: string;
  }[];
}

export interface ErrorEvent {
  type: "error";
  error: string;
  context?: any;
  timestamp: string;
}

export type ChatServiceEvent =
  | InviteReceivedEvent
  | InviteAcceptedEvent
  | InviteRejectedEvent
  | MessageReceivedEvent
  | InviteAccept
  | ChatSubscribedEvent
  | PresenceUpdateEvent
  | LoadConversations
  | ErrorEvent;

// ============================================================================
// SERVIÇO PRINCIPAL
// ============================================================================

export class NewChatService {
  private mqttService: MqttService;
  private userId: string;
  private controlTopic: string;
  private presenceTopic: string;
  private presenceTopicOthers: string;
  private loadConversation: string;
  // Fila de eventos
  private eventQueue: ChatServiceEvent[] = [];

  constructor(mqttService: MqttService) {
    this.mqttService = mqttService;
    this.userId = mqttService.getClientId();
    this.controlTopic = `control/${this.userId}`;
    this.presenceTopic = `presence/${this.userId}`;
    this.presenceTopicOthers = `presence`;
    this.loadConversation = `control/loadconversation/${this.userId}`;

    this.setupPresenceListener();
  }

  // ==========================================================================
  // SETUP INICIAL
  // ==========================================================================

  async initialize() {
    this.loadConversations();
    this.setupControlChannel();
    this.setOnlineStatus();
  }

  private setupControlChannel(): void {
    this.mqttService.subscribe(
      this.controlTopic,
      (_topic, payload) => {
        try {
          const message: ControlMessage = JSON.parse(payload);
          this.handleControlMessage(message);
        } catch (error) {
          this.pushEvent({
            type: "error",
            error: "Erro ao processar mensagem de controle",
            context: { payload, error },
            timestamp: new Date().toISOString(),
          });
        }
      },
      1
    );

    console.log(`🎧 [${this.userId}] Canal de controle: ${this.controlTopic}`);
  }

  private loadConversations(): void {
    // retain: true = mantém o último estado no broker
    this.mqttService.subscribe(this.loadConversation, () => {}, 1);

    console.log(`👤 [${this.userId}] Carregar Conversas`);
  }

  // ==========================================================================
  // Publicação de Status
  // ==========================================================================

  private setOnlineStatus(): void {
    const presenceMessage = {
      userId: this.userId,
      status: "online",
      timestamp: new Date().toISOString(),
    };

    // retain: true = mantém o último estado no broker
    this.mqttService.publish(this.presenceTopic, presenceMessage, 1, true);
    this.mqttService.subscribe(`${this.presenceTopicOthers}/#`, () => {}, 1);

    console.log(`👤 [${this.userId}] Status: ONLINE`);
  }

  public pingStatusPresence() {
    this.mqttService.subscribe(`${this.presenceTopicOthers}/#`, () => {}, 1);
  }

  private setOfflineStatus(): void {
    const presenceMessage = {
      userId: this.userId,
      status: "offline",
      timestamp: new Date().toISOString(),
    };

    // retain: true = Atualiza última mensagem no broker
    this.mqttService.publish(this.presenceTopic, presenceMessage, 1, true);
  }

  //✅ Marca como offline

  setStatusDisconnect(): void {
    this.setOfflineStatus();
    // ... resto do código de desconexão
  }

  //✅ Marca como online

  setStatusConnect(): void {
    this.setOfflineStatus();
    // ... resto do código de desconexão
  }

  // ==========================================================================
  // Listener para presence
  // ==========================================================================

  private setupPresenceListener(): void {
    // Captura TODAS as mensagens
    this.mqttService.setGlobalMessageHandler((topic, payload) => {
      //Captura mensagem topic presence
      if (topic.startsWith(this.presenceTopicOthers)) {
        try {
          const presence = JSON.parse(payload);
          //Se for presenca do propio usuario retorna
          if (presence.userId === this.userId) return;

          this.eventQueue.push({
            type: "presence_update",
            userId: presence.userId,
            status: presence.status,
            timestamp: presence.timestamp,
          });
        } catch (error) {
          this.eventQueue.push({
            type: "error",
            error: "Erro ao processar presença",
            context: { topic, payload, error },
            timestamp: new Date().toISOString(),
          });
        }
      }
      // Carregar conversas
      if (topic.startsWith(this.loadConversation)) {
        try {
          const conversarion = JSON.parse(payload);
          const loadEvent: LoadConversations = {
            type: "load_conversation",
            conversations: conversarion.conversations.map((item: any) => ({
              userId: item.userId,
              topic: item.topic,
              chatIndividual: item.chatIndividual,
              timestamp: item.timestamp,
            })),
          };
          this.eventQueue.push(loadEvent);
        } catch (error) {
          this.eventQueue.push({
            type: "error",
            error: "Erro ao processar presença",
            context: { topic, payload, error },
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (topic.startsWith("chat/")) {
        const message = JSON.parse(payload);
        if (message.from === this.userId) {
          return;
        }

        this.pushEvent({
          type: "message_received",
          from: message.from,
          content: message.content,
          messageId: message.messageId,
          chatTopic: message.chatTopic,
          timestamp: message.timestamp,
        });

        console.log(
          `💬 [${this.userId}] Mensagem de ${message.from}: ${message.content}`
        );
      }
    });
  }

  // ==========================================================================
  // CARREGAR E SALVAR CONVERSAS E GRUPOS
  // ==========================================================================

  public setConversations(conversations: LoadConversations): void {
    const conversation = {
      type: conversations.type,
      conversations: conversations.conversations.map((c) => ({
        userId: c.userId,
        topic: c.topic,
        chatIndividual: c.chatIndividual,
        timestamp: c.timestamp,
      })),
    };

    // retain: true = mantém a última versão no broker
    this.mqttService.publish(this.loadConversation, conversation, 1, true);

    console.log(`👤 [${this.userId}] publicado conversas`, conversation);
  }

  public cleanConversations(): void {
    const conversation = "";
    this.mqttService.publish(this.loadConversation, conversation, 1, true);
  }

  // ==========================================================================
  // PROCESSAMENTO DE MENSAGENS DE CONTROLE
  // ==========================================================================

  private handleControlMessage(message: ControlMessage | ChatMessage): void {
    console.log("Tipo da Mensagem no HANDLER", message.type);
    switch (message.type) {
      case "invite_received":
        this.handleInviteReceived(message);
        break;
      case "invite_accepted":
        this.handleInviteAccepted(message);
        break;
      case "invite_rejected":
        this.handleInviteRejected(message);
        break;
      default:
        this.pushEvent({
          type: "error",
          error: "Mensagem desconhecida",
          context: { message },
          timestamp: new Date().toISOString(),
        });
        console.log(message);
        break;
    }
  }

  private handleInviteReceived(message: InviteRequest): void {
    console.log(`📨 [${this.userId}] Convite recebido de ${message.from}`);

    this.pushEvent({
      type: "invite_received",
      from: message.from,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  private handleInviteAccepted(message: InviteAccept): void {
    message.chatTopic = this.createChatTopic(message.from, this.userId);
    console.log(`✅ [${this.userId}] Convite aceito por ${message.from}`);
    console.log(`📍 [${this.userId}] Novo chat: ${message.chatTopic}`);

    // Automaticamente se inscreve no novo chat
    this.subscribeToChatTopic(message.chatTopic);

    this.pushEvent({
      type: "invite_accepted",
      acceptedBy: message.from,
      chatTopic: message.chatTopic,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  private handleInviteRejected(message: InviteReject): void {
    console.log(`❌ [${this.userId}] Convite rejeitado por ${message.from}`);

    this.pushEvent({
      type: "invite_rejected",
      rejectedBy: message.from,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  // ==========================================================================
  // ENVIO DE CONVITES
  // ==========================================================================

  /**
   * Envia convite para outro usuário
   * O convite é enviado para o tópico de controle padrão do destinatário
   */
  sendInvite(targetUserId: string, userId = this.userId): string {
    const requestId = `invite_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const inviteMessage: InviteRequest = {
      type: "invite_received",
      from: userId,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia para tópico padrão do destinatário
    const targetControlTopic = `control/${targetUserId}`;
    this.mqttService.publish(targetControlTopic, inviteMessage, 1);

    console.log(
      `📤 [${this.userId}] Convite enviado para com QOS 1 ${targetUserId}`
    );
    console.log(`🆔 Request ID: ${requestId}`);

    return requestId;
  }

  // ==========================================================================
  // RESPOSTA A CONVITES
  // ==========================================================================

  /**
   * Aceita um convite recebido
   * Cria um novo tópico de chat e envia a resposta para o remetente original
   * Retorna o tópico criado
   */
  acceptInvite(requestId: string, fromUserId: string): string {
    // Cria tópico único para o chat
    const chatTopic = this.createChatTopic(fromUserId, this.userId);

    const acceptMessage: InviteAccept = {
      type: "invite_accepted",
      from: this.userId,
      to: fromUserId,
      chatTopic,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia aceite para o tópico de controle do remetente original
    const targetControlTopic = `control/${fromUserId}`;
    this.mqttService.publish(targetControlTopic, acceptMessage);

    console.log(`✅ [${this.userId}] Convite aceito!`);
    console.log(`📍 [${this.userId}] Chat criado: ${chatTopic}`);

    return chatTopic;
  }

  /**
   * Rejeita um convite recebido
   * Envia a resposta para o remetente original
   */
  rejectInvite(requestId: string, fromUserId: string): void {
    const rejectMessage: InviteReject = {
      type: "invite_rejected",
      from: this.userId,
      to: fromUserId,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia rejeição para o tópico de controle do remetente original
    const targetControlTopic = `control/${fromUserId}`;
    this.mqttService.publish(targetControlTopic, rejectMessage);

    console.log(`❌ [${this.userId}] Convite rejeitado`);
  }

  // ==========================================================================
  // GERENCIAMENTO DE CHATS
  // ==========================================================================

  /**
   * Se inscreve em um tópico de chat para receber mensagens
   */
  subscribeToChatTopic(chatTopic: string): void {
    this.mqttService.subscribe(chatTopic, () => {}, 1);

    this.pushEvent({
      type: "chat_subscribed",
      chatTopic,
      timestamp: new Date().toISOString(),
    });

    console.log(`🔔 [${this.userId}] Inscrito no chat: ${chatTopic}`);
  }

  // ==========================================================================
  // ENVIO DE MENSAGENS
  // ==========================================================================

  /*
   * Envia mensagem para um chat específico
   */
  sendMessage(chatTopic: string, content: string): string {
    const messageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const message: ChatMessage = {
      type: "message",
      from: this.userId,
      content,
      messageId,
      chatTopic: chatTopic,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(chatTopic, message, 1);

    console.log(`📨 [${this.userId}] Mensagem enviada para ${chatTopic}`);

    return messageId;
  }

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================

  /**
   * Cria tópico único para conversa entre dois usuários
   * Ordena os IDs para garantir o mesmo tópico independente de quem convida
   */
  private createChatTopic(user1: string, user2: string): string {
    const sortedUsers = [user1, user2].sort();
    return `chat/${sortedUsers[0]}_${sortedUsers[1]}`;
  }

  /**
   * Adiciona evento à fila
   */
  private pushEvent(event: ChatServiceEvent): void {
    this.eventQueue.push(event);
  }

  // ==========================================================================
  // API DE EVENTOS
  // ==========================================================================

  /**
   * Retorna seu ID de usuário
   */
  getUserId(): string {
    return this.userId;
  }

  /**
   * Retorna todos os eventos pendentes e limpa a fila
   */
  pollAllEvents(): ChatServiceEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }
}
