import { useState } from "react";
import ButtonAppBar from "../../components/ButtonAppBar/ButtonAppBar";
import SideAppBar from "../../components/SideAppBar/SideAppBar";
import ModalPhoneDrawer from "../../components/ModalPhone/ModalPhone";
import { ChatWindow } from "../chat/ChatWindown/ChatWindown";
import { ChatInput } from "../chat/ChatInput/ChatInput";

// Tipo da mensagem
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
  const [positionMenu, setPositionMenu] = useState(false);
  const [positionModal, setPositionModal] = useState(false);

  // IDs dos botões na SideAppBar
  const [buttons, setButtons] = useState<number[]>([9999, 9998, 9997]);

  // Lista de conversas
  const [conversation, setConversation] = useState<TypeConversation[]>([
    {
      id: 9999,
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
      id: 9998,
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
      if (conv) setSelectedConversation(conv);
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

  return (
    <>
      {/* Modal de telefone */}
      <ModalPhoneDrawer
        open={positionModal}
        onClose={() => setPositionModal(false)}
      />
      {/* Top AppBar */}
      <ButtonAppBar
        onMenuClick={() => setPositionMenu(!positionMenu)}
        onLoginCLick={() => setPositionModal(true)}
      />
      {/* SideBar */}
      <SideAppBar
        open={positionMenu}
        buttons={buttons}
        onSelect={(id) => loadConversation(id)}
      />
      <ChatWindow
        sx={{
          width: positionMenu ? "calc(95vw - 240px)" : "95vw", // diminui quando sidebar aberta
          marginLeft: positionMenu ? "240px" : 0, // empurra à direita
          transition: "width 0.3s ease, margin-left 0.3s ease",
        }}
        messages={selectedConversation}
      />{" "}
      <ChatInput
        sx={{
          width: positionMenu ? "calc(95vw - 240px)" : "95vw", // diminui quando sidebar aberta
          marginLeft: positionMenu ? "240px" : 0, // empurra à direita
          transition: "width 0.3s ease, margin-left 0.3s ease",
        }}
      />
    </>
  );
}
