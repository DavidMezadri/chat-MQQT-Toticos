import { useEffect, useState } from "react";

import SideAppBar from "../../components/SideAppBar/SideAppBar";
import ModalPhoneDrawer from "../../components/ModalPhone/ModalPhone";
import AppTopBar from "../../components/AppTopBar/AppTopBar";

import { ChatWindow } from "../chat/ChatWindown/ChatWindown";
import { ChatInput } from "../chat/ChatInput/ChatInput";
import { MqttService } from "../../service/MqttService";
import { AcceptDialog } from "../../components/AcceptDialog/AcceptDialog";
import { ChatConversationService } from "../../service/ChatConversationService";
import { NewChatService } from "../../service/NewChatService";

export interface Message {
  TimeStamp: string;
  text: string;
  author: string;
}

export interface TypeConversation {
  id: number;
  name?: string;
  Messages?: Message[];
}

export default function Conversation() {
  //Setando os serviços
  const [mqttService, setMqttService] = useState<MqttService>();
  const [newChatService, setNewChatService] = useState<NewChatService>();
  
  const [positionMenu, setPositionMenu] = useState(false);
  const [visibleModalPhoneDrawer, setVisibleModalPhoneDrawer] = useState(false);
  const [infoAcceptDialog, setInfoAcceptDialog] = useState({from: "", requestId: "", timestamp: ""});

  useEffect(() => {
    const interval = setInterval(() => {
      const events = newChatService?.pollAllEvents();
      if (!events) return;
      for (const ev of events) {
        if (ev.type === "invite_received") {
          setInfoAcceptDialog({from: ev.from, requestId: ev.requestId, timestamp: ev.timestamp });
        }

        if (ev.type === "invite_accepted") {
        setButtons((prev) => [...prev, ev.acceptedBy]);
        }
      }
      
    }, 300);

    return () => clearInterval(interval);
  }, [newChatService]);

  

  // IDs dos botões na SideAppBar
  const [buttons, setButtons] = useState<string[]>([
  ]);

  // Lista de conversas
  const [conversation, setConversation] = useState<TypeConversation[]>([
    {
      id: 9999999999,
      name: "João",
      Messages: [
        { author: "João", TimeStamp: new Date().toISOString(), text: "Oi!" },
        {
          author: "Você",
          TimeStamp: new Date().toISOString(),
          text: "Oi João, tudo bem?",
        },
      ],
    },
    {
      id: 2899294599,
      name: "Maria",
      Messages: [
        {
          author: "Maria",
          TimeStamp: new Date().toISOString(),
          text: "Tudo bem?",
        },
        {
          author: "Você",
          TimeStamp: new Date().toISOString(),
          text: "Tudo sim, Maria!",
        },
      ],
    },
    {
      id: 9997,
      name: "Pedro",
      Messages: [
        { author: "Pedro", TimeStamp: new Date().toISOString(), text: "Olá!" },
        {
          author: "Você",
          TimeStamp: new Date().toISOString(),
          text: "Olá Pedro!",
        },
      ],
    },
  ]);

  // Conversa selecionada
  const [selectedConversation, setSelectedConversation] =
    useState<TypeConversation>({
      id: 0,
      name: "",
      Messages: [{ author: "", TimeStamp: new Date().toISOString(), text: "" }],
    });

  // Seleciona ou cria conversa
  function loadConversation(id?: number, name?: string) {
    if (id) {
      const conv = conversation.find((c) => c.id === id);
      if (conv) {
        setSelectedConversation(conv);
        ChatConversationService?.joinChat("/chat");
        console.log(ChatConversationService);
      }
      return;
    }

    // Criar nova conversa
    const newId = Math.floor(Math.random() * 9000) + 1000;
    const newConv: TypeConversation = {
      id: newId,
      name: name || `Contato ${newId}`,
      Messages: [],
    };
    setConversation((prev) => [...prev, newConv]);
    setButtons((prev) => [...prev, newId]);
    setSelectedConversation(newConv);
  }

  //Aqui vamos setar o número de telefone
  async function setMyNumberTelephone(number: string) {
    const mqttService = new MqttService({
      clientId: number,
      brokerHost: "localhost",
      brokerPort: 9001,
      useSSL: false,
    });
    await mqttService.connect();
    setMqttService(mqttService);
    if (mqttService === undefined) {
      return;
    }
    const chatService = new NewChatService(mqttService);
    setNewChatService(chatService);
  }

  return (
    <>
      <ModalPhoneDrawer
        open={visibleModalPhoneDrawer}
        onClose={() => setVisibleModalPhoneDrawer(false)}
        onConfirm={(numberTelephone) => setMyNumberTelephone(numberTelephone)}
      />
      <AppTopBar
        onMenuClick={() => setPositionMenu(!positionMenu)}
        onLoginCLick={() => setVisibleModalPhoneDrawer(true)}
      />


      <SideAppBar
        open={positionMenu}
        buttons={buttons}
        onSelect={(id) => loadConversation(id)}
        newChatService={newChatService}
      />


      <ChatWindow
        sx={{
          marginTop: "8px",
          width: positionMenu ? "calc(100 - 240px)" : "100", // diminui quando sidebar aberta
          marginLeft: positionMenu ? "240px" : 0, // empurra à direita
          transition: "width 0.3s ease, margin-left 0.3s ease",
        }}
        messages={selectedConversation}
      />{" "}
      <ChatInput
        topic="general"
        chatConversationService={(text) => newChatService?.sendInvite(newChatService.getUserId(), text)}
        
        sx={{
          width: positionMenu ? "calc(100 - 240px)" : "100", // diminui quando sidebar aberta
          marginLeft: positionMenu ? "240px" : "100", // empurra à direita
          transition: "width 0.3s ease, margin-left 0.3s ease",
        }}
      />
      <AcceptDialog
        invite={infoAcceptDialog ? { from: infoAcceptDialog.from, requestId: infoAcceptDialog.requestId, timestamp: infoAcceptDialog.timestamp } : null}
        onAccept={() => newChatService?.acceptInvite(infoAcceptDialog.requestId, infoAcceptDialog.from)}
        onReject={() => newChatService?.rejectInvite(infoAcceptDialog.requestId, infoAcceptDialog.from)}
        onClose={() => setInfoAcceptDialog({from: "", requestId: "", timestamp: ""})}
        //INSERIR A FUNÇÃO PARA CRIAR O NOVO CHAT AQUI QUANDO ACEITO - PQ NAO TEMOS EVENTO PARA ACEITAR
        onNewChat={() => setButtons((prev) => [...prev, infoAcceptDialog.from])}
      />
    </>
  );
}
