import { WelcomeChatbotPage } from "@/components/assistants/welcome-chatbot-page"

export default function HomePage() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <WelcomeChatbotPage chatType="ask-b" />
    </div>
  );
}
