import App from "../components/App";
export default async function Home({ searchParams }) {
  const query = await searchParams;
  const initialConversation =
    typeof query.conversation === "string" &&
    /^agent(?:-[a-zA-Z0-9_-]{1,90})?$/.test(query.conversation)
      ? query.conversation
      : undefined;
  const initialMessageId =
    initialConversation && /^[a-zA-Z0-9_-]{1,100}$/.test(query.message || "")
      ? query.message
      : undefined;
  return (
    <App
      initialConversation={initialConversation}
      initialMessageId={initialMessageId}
    />
  );
}
