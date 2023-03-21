import React, { useState } from "react";

interface ScrollableTextProps {
  text: string;
}

const ScrollableText: React.FC<ScrollableTextProps> = ({ text }) => {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <button 
        style={{ position: 'absolute', left: "20px", bottom: "140px" }}
        onClick={() => setVisible(true)}
      >
        Display Case File
      </button>
    );
  }

  return (
    <div style={{ overflowY: "scroll", height: "400px", width: "510px" }}>
      <pre style={{ whiteSpace: "pre-wrap" }}>{text}</pre>
      <button 
        style={{ position: 'absolute', left: "20px", bottom: "140px" }}
        onClick={() => setVisible(false)}
      >
        Hide Case File
      </button>
    </div>
  );
};

export default ScrollableText;