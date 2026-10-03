import React from "react";
import Messenger from "../Messenger";

export default function App(props) {
  return (
    <div className="App">
      <Messenger {...props} />
    </div>
  );
}
