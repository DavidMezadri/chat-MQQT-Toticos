import React, { useState } from "react";

import { Box, ButtonBase, InputBase } from "@mui/material";

import "./../../../index.css";

interface ChatInputProps {
  sx?: object;
  chatConversationService?: (topic: string, text: string) => void;
  topic: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  sx,
  chatConversationService,
  topic,
}) => {
  const [text, setText] = useState("");

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        paddingTop: 1,
        ...sx, // aplica estilos externos se houver
      }}
    >
      <InputBase
        sx={{
          fontSize: "30px",
          borderRadius: 1,
          padding: "10px",
          backgroundColor: "white", // fundo branco
          width: "100%",
          height: "4vh", // altura fixa ou percentual
        }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Digite sua mensagem"
      />
      <ButtonBase
        sx={{
          borderRadius: 1,
          padding: "10px",
          backgroundColor: "var(--color-send-button)", // fundo branco
          width: "100px",
          height: "4vh", // altura fixa ou percentual
        }}
        onClick={() => {
          chatConversationService?.(topic, text);
          setText("");
        }}
      >
        Enviar
      </ButtonBase>
    </Box>
  );
};
