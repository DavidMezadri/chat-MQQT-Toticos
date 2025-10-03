import React, { useState, useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";

export const ChatInput: React.FC = () => {
  const [text, setText] = useState("");
  const { sendMessage } = useContext(ChatContext);

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text);
      setText("");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Digite sua mensagem"
      />
      <Button onClick={handleSend}>Enviar</Button>
    </div>
  );
};