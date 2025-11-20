import type { MqttService } from "./MqttService";

// ============================================================================
// TIPOS DE MENSAGENS DE GRUPO
// ============================================================================

export interface GroupCreateMessage {
  type: "group_create";
  groupId: string;
  groupName: string;
  adminId: string;
  timestamp: string;
}

export interface GroupJoinRequest {
  type: "group_join_request";
  groupId: string;
  userId: string;
  requestId: string;
  timestamp: string;
}

export interface GroupJoinApproval {
  type: "group_join_approval";
  groupId: string;
  groupTopic: string;
  userId: string;
  requestId: string;
  approvedBy: string;
  timestamp: string;
}

export interface GroupJoinRejection {
  type: "group_join_rejection";
  groupId: string;
  userId: string;
  requestId: string;
  rejectedBy: string;
  timestamp: string;
}

export interface GroupMessage {
  type: "group_message";
  groupId: string;
  from: string;
  content: string;
  messageId: string;
  timestamp: string;
}

export interface GroupMemberLeft {
  type: "group_member_left";
  groupId: string;
  userId: string;
  timestamp: string;
}

export interface GroupListRequest {
  type: "group_list_request";
  requestId: string;
  requestedBy: string;
  timestamp: string;
}

export interface GroupListResponse {
  type: "group_list_response";
  groups: GroupInfo[];
  requestId: string;
  timestamp: string;
}

export interface GroupInfo {
  groupId: string;
  groupName: string;
  adminId: string;
  memberCount: number;
}

// ============================================================================
// EVENTOS DO SERVIÇO DE GRUPOS
// ============================================================================

export interface GroupCreatedEvent {
  type: "group_created";
  groupId: string;
  groupName: string;
  groupTopic: string;
  timestamp: string;
}

export interface GroupJoinRequestEvent {
  type: "group_join_request_received";
  groupId: string;
  userId: string;
  requestId: string;
  timestamp: string;
}

export interface GroupJoinApprovedEvent {
  type: "group_join_approved";
  groupId: string;
  groupTopic: string;
  requestId: string;
  timestamp: string;
}

export interface GroupJoinRejectedEvent {
  type: "group_join_rejected";
  groupId: string;
  requestId: string;
  timestamp: string;
}

export interface GroupMessageReceivedEvent {
  type: "group_message_received";
  groupId: string;
  from: string;
  content: string;
  messageId: string;
  timestamp: string;
}

export interface GroupMemberLeftEvent {
  type: "group_member_left";
  groupId: string;
  userId: string;
  timestamp: string;
}

export interface GroupListReceivedEvent {
  type: "group_list_received";
  groups: GroupInfo[];
  requestId: string;
  timestamp: string;
}

export interface GroupErrorEvent {
  type: "group_error";
  error: string;
  context?: any;
  timestamp: string;
}

export type GroupServiceEvent =
  | GroupCreatedEvent
  | GroupJoinRequestEvent
  | GroupJoinApprovedEvent
  | GroupJoinRejectedEvent
  | GroupMessageReceivedEvent
  | GroupMemberLeftEvent
  | GroupListReceivedEvent
  | GroupErrorEvent;

// ============================================================================
// SERVIÇO DE GRUPOS
// ============================================================================

export class GroupService {
  private mqttService: MqttService;
  private userId: string;
  private groupControlTopic: string;
  private groupListTopic: string;
  private eventQueue: GroupServiceEvent[] = [];

  // Grupos que o usuário administra
  private adminGroups: Map<string, GroupInfo> = new Map();

  // Grupos que o usuário participa
  private memberGroups: Set<string> = new Set();

  constructor(mqttService: MqttService) {
    this.mqttService = mqttService;
    this.userId = mqttService.getClientId();
    this.groupControlTopic = `group/control/${this.userId}`;
    this.groupListTopic = `group/list`;

    // Configura handler global para mensagens de grupo
    this.setupGlobalHandler();

    console.log(`🏢 [${this.userId}] GroupService criado`);
  }

  // ==========================================================================
  // SETUP DO HANDLER GLOBAL
  // ==========================================================================

  private setupGlobalHandler(): void {
    const existingHandler = this.mqttService["globalMessageHandler"];

    this.mqttService.setGlobalMessageHandler((topic, payload) => {
      // Chama o handler existente primeiro (se houver)
      if (existingHandler) {
        existingHandler(topic, payload);
      }

      // Processa mensagens de grupo
      try {
        if (topic.startsWith("group/control/")) {
          this.handleGroupControlMessage(topic, payload);
        } else if (topic.startsWith("group/chat/")) {
          this.handleGroupChatMessage(topic, payload);
        } else if (topic === this.groupListTopic) {
          this.handleGroupListMessage(payload);
        }
      } catch (error) {
        this.pushEvent({
          type: "group_error",
          error: "Erro ao processar mensagem de grupo",
          context: { topic, payload, error },
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // ==========================================================================
  // INICIALIZADOR
  // ==========================================================================

  async initialize(): Promise<void> {
    // Inscreve no tópico de controle do usuário
    this.mqttService.subscribe(this.groupControlTopic, undefined, 1);
    console.log(`🎧 [${this.userId}] Inscrito em: ${this.groupControlTopic}`);

    // Inscreve no tópico de lista de grupos
    this.mqttService.subscribe(this.groupListTopic, undefined, 1);
    console.log(`📋 [${this.userId}] Inscrito em: ${this.groupListTopic}`);
  }

  // ==========================================================================
  // PROCESSAMENTO DE MENSAGENS
  // ==========================================================================

  private handleGroupControlMessage(topic: string, payload: string): void {
    const message = JSON.parse(payload);

    switch (message.type) {
      case "group_join_request":
        this.handleJoinRequest(message);
        break;
      case "group_join_approval":
        this.handleJoinApproval(message);
        break;
      case "group_join_rejection":
        this.handleJoinRejection(message);
        break;
      case "group_member_left":
        this.handleMemberLeft(message);
        break;
    }
  }

  private handleGroupChatMessage(topic: string, payload: string): void {
    const message: GroupMessage = JSON.parse(payload);

    // Ignora próprias mensagens
    if (message.from === this.userId) {
      return;
    }

    this.pushEvent({
      type: "group_message_received",
      groupId: message.groupId,
      from: message.from,
      content: message.content,
      messageId: message.messageId,
      timestamp: message.timestamp,
    });
  }

  private handleGroupListMessage(payload: string): void {
    const message: GroupListResponse = JSON.parse(payload);

    this.pushEvent({
      type: "group_list_received",
      groups: message.groups,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  private handleJoinRequest(message: GroupJoinRequest): void {
    console.log(
      `📨 [${this.userId}] Pedido de entrada no grupo ${message.groupId} de ${message.userId}`
    );

    this.pushEvent({
      type: "group_join_request_received",
      groupId: message.groupId,
      userId: message.userId,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  private handleJoinApproval(message: GroupJoinApproval): void {
    console.log(
      `✅ [${this.userId}] Aprovado para entrar no grupo ${message.groupId}`
    );

    // Automaticamente se inscreve no chat do grupo
    this.subscribeToGroup(message.groupId, message.groupTopic);

    this.pushEvent({
      type: "group_join_approved",
      groupId: message.groupId,
      groupTopic: message.groupTopic,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  private handleJoinRejection(message: GroupJoinRejection): void {
    console.log(
      `❌ [${this.userId}] Rejeitado para entrar no grupo ${message.groupId}`
    );

    this.pushEvent({
      type: "group_join_rejected",
      groupId: message.groupId,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  private handleMemberLeft(message: GroupMemberLeft): void {
    console.log(
      `👋 [${this.userId}] ${message.userId} saiu do grupo ${message.groupId}`
    );

    this.pushEvent({
      type: "group_member_left",
      groupId: message.groupId,
      userId: message.userId,
      timestamp: message.timestamp,
    });
  }

  // ==========================================================================
  // CRIAR GRUPO (ADMIN)
  // ==========================================================================

  createGroup(groupName: string): string {
    const groupId = `group_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const groupTopic = `group/chat/${groupId}`;

    const groupInfo: GroupInfo = {
      groupId,
      groupName,
      adminId: this.userId,
      memberCount: 1,
    };

    // Armazena como grupo administrado
    this.adminGroups.set(groupId, groupInfo);

    // Publica criação do grupo no tópico de lista
    const createMessage: GroupCreateMessage = {
      type: "group_create",
      groupId,
      groupName,
      adminId: this.userId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(this.groupListTopic, createMessage, 1, true);

    // Se inscreve automaticamente no grupo
    this.subscribeToGroup(groupId, groupTopic);

    this.pushEvent({
      type: "group_created",
      groupId,
      groupName,
      groupTopic,
      timestamp: new Date().toISOString(),
    });

    console.log(`🏢 [${this.userId}] Grupo criado: ${groupName} (${groupId})`);

    return groupId;
  }

  // ==========================================================================
  // SOLICITAR ENTRADA NO GRUPO (USUÁRIO)
  // ==========================================================================

  requestJoinGroup(groupId: string, adminId: string): string {
    const requestId = `join_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const joinRequest: GroupJoinRequest = {
      type: "group_join_request",
      groupId,
      userId: this.userId,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia para o tópico de controle do admin
    const adminControlTopic = `group/control/${adminId}`;
    this.mqttService.publish(adminControlTopic, joinRequest, 1);

    console.log(
      `📤 [${this.userId}] Pedido de entrada enviado para o grupo ${groupId}`
    );

    return requestId;
  }

  // ==========================================================================
  // APROVAR ENTRADA NO GRUPO (ADMIN)
  // ==========================================================================

  approveJoinRequest(groupId: string, userId: string, requestId: string): void {
    // Verifica se é admin do grupo
    if (!this.adminGroups.has(groupId)) {
      console.error(`❌ [${this.userId}] Não é admin do grupo ${groupId}`);
      return;
    }

    const groupTopic = `group/chat/${groupId}`;

    const approval: GroupJoinApproval = {
      type: "group_join_approval",
      groupId,
      groupTopic,
      userId,
      requestId,
      approvedBy: this.userId,
      timestamp: new Date().toISOString(),
    };

    // Envia aprovação para o usuário
    const userControlTopic = `group/control/${userId}`;
    this.mqttService.publish(userControlTopic, approval, 1);

    // Atualiza contador de membros
    const groupInfo = this.adminGroups.get(groupId)!;
    groupInfo.memberCount++;

    console.log(
      `✅ [${this.userId}] Aprovado ${userId} para o grupo ${groupId}`
    );
  }

  // ==========================================================================
  // REJEITAR ENTRADA NO GRUPO (ADMIN)
  // ==========================================================================

  rejectJoinRequest(groupId: string, userId: string, requestId: string): void {
    // Verifica se é admin do grupo
    if (!this.adminGroups.has(groupId)) {
      console.error(`❌ [${this.userId}] Não é admin do grupo ${groupId}`);
      return;
    }

    const rejection: GroupJoinRejection = {
      type: "group_join_rejection",
      groupId,
      userId,
      requestId,
      rejectedBy: this.userId,
      timestamp: new Date().toISOString(),
    };

    // Envia rejeição para o usuário
    const userControlTopic = `group/control/${userId}`;
    this.mqttService.publish(userControlTopic, rejection, 1);

    console.log(
      `❌ [${this.userId}] Rejeitado ${userId} para o grupo ${groupId}`
    );
  }

  // ==========================================================================
  // ENVIAR MENSAGEM NO GRUPO
  // ==========================================================================

  sendGroupMessage(groupId: string, content: string): string {
    const messageId = `gmsg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const groupTopic = `group/chat/${groupId}`;

    const message: GroupMessage = {
      type: "group_message",
      groupId,
      from: this.userId,
      content,
      messageId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(groupTopic, message, 1);

    console.log(`📨 [${this.userId}] Mensagem enviada para o grupo ${groupId}`);

    return messageId;
  }

  // ==========================================================================
  // SAIR DO GRUPO
  // ==========================================================================

  leaveGroup(groupId: string): void {
    const groupTopic = `group/chat/${groupId}`;

    // Notifica saída
    const leftMessage: GroupMemberLeft = {
      type: "group_member_left",
      groupId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(groupTopic, leftMessage, 1);

    // Remove das inscrições
    this.mqttService.unsubscribe(groupTopic);
    this.memberGroups.delete(groupId);

    console.log(`👋 [${this.userId}] Saiu do grupo ${groupId}`);
  }

  // ==========================================================================
  // LISTAR TODOS OS GRUPOS
  // ==========================================================================

  requestGroupList(): string {
    const requestId = `list_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const listRequest: GroupListRequest = {
      type: "group_list_request",
      requestId,
      requestedBy: this.userId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(this.groupListTopic, listRequest, 1);

    console.log(`📋 [${this.userId}] Solicitando lista de grupos`);

    return requestId;
  }

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================

  private subscribeToGroup(groupId: string, groupTopic: string): void {
    this.mqttService.subscribe(groupTopic, undefined, 1);
    this.memberGroups.add(groupId);
    console.log(`🔔 [${this.userId}] Inscrito no grupo: ${groupId}`);
  }

  private pushEvent(event: GroupServiceEvent): void {
    this.eventQueue.push(event);
  }

  // ==========================================================================
  // API DE EVENTOS
  // ==========================================================================

  pollEvent(): GroupServiceEvent | null {
    return this.eventQueue.shift() || null;
  }

  pollAllEvents(): GroupServiceEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }

  hasEvents(): boolean {
    return this.eventQueue.length > 0;
  }

  getEventCount(): number {
    return this.eventQueue.length;
  }

  getUserId(): string {
    return this.userId;
  }

  getAdminGroups(): GroupInfo[] {
    return Array.from(this.adminGroups.values());
  }

  getMemberGroups(): string[] {
    return Array.from(this.memberGroups);
  }
}
