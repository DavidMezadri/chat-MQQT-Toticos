import React, { useState, useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";
import { Box } from "@mui/material";

interface ChatInputProps {
  sx?: object;
}

export const ChatInput: React.FC<ChatInputProps> = ({ sx }) => {
  const [text, setText] = useState("");
  const { sendMessage } = useContext(ChatContext);

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text);
      setText("");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        padding: 1,
        ...sx, // aplica estilos externos se houver
      }}
    >
      <Input
        sx={{
          width: "80vw", // largura fixa ou percentual
          height: "80vh", // altura fixa ou percentual
        }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Digite sua mensagem"
      />
      <Button onClick={handleSend}>Enviar</Button>
    </Box>
  );
};
