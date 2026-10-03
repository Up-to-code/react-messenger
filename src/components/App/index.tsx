import React from "react";
import Messenger from "../Messenger";

export default function App(props: {
  initialConversation?: string;
  initialMessageId?: string;
}) {
  return (
    <div className="App">
      <Messenger {...props} />
    </div>
  );
}
