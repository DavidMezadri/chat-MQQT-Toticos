import React, { useContext } from "react";
import { ChatContext } from "../../../context/ChatContext"
import { Message } from "../Message/Message";

export const ChatWindow: React.FC = () => {
  const { messages } = useContext(ChatContext);

  return (
    <div style={{ border: "1px solid #ccc", padding: 8, height: 300, overflowY: "scroll" }}>
      {messages.map((msg, idx) => (
        <Message
          key={idx}
          author={msg.author}
          text={msg.text}
          timestamp={msg.timestamp}
        />
      ))}
    </div>
  );
};
