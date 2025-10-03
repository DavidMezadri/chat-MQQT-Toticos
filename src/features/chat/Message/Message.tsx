import React from "react";

interface MessageProps {
  author: string;
  text: string;
  timestamp: string;
}

export const Message: React.FC<MessageProps> = ({ author, text, timestamp }) => {
  return (
    <div style={{ marginBottom: 8 }}>
      <strong>{author}</strong> <em>{timestamp}</em>
      <p>{text}</p>
    </div>
  );
};
