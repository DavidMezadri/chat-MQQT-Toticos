import React from "react";
import { ChatProvider } from "./context/ChatContext";

import Conversations from "./features/Menu/Conversations";

export const App: React.FC = () => {
  return (
    <ChatProvider>
      <Conversations />
    </ChatProvider>
  );
};
