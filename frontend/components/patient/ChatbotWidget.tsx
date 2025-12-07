"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

export default function ChatbotWidget() {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[chatbot_id="68ef9c96b8942e3343448754"]');
    if (existingScript) {
      return;
    }

    // Load the ThinkStack AI chatbot script
    const script = document.createElement("script");
    script.setAttribute("chatbot_id", "68ef9c96b8942e3343448754");
    script.setAttribute("data-type", "default");
    script.src = "https://app.thinkstack.ai/bot/thinkstackai-loader.min.js";
    script.async = true;
    
    script.onload = () => {
      console.log("ThinkStack AI chatbot loaded successfully");
      setLoadError(false);
    };

    script.onerror = () => {
      console.error("Failed to load ThinkStack AI chatbot - The chatbot service may be temporarily unavailable");
      setLoadError(true);
    };

    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Show fallback message if chatbot fails to load
  if (loadError) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-200">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Chat Unavailable</p>
              <p className="text-xs text-gray-600 mt-1">
                Our chat assistant is temporarily unavailable. Please try again later or contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ThinkStack AI will handle its own UI when loaded successfully
  return null;
}
