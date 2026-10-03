export function chatReducer(state, action) {
  if (action.type === "restore") return action.conversations;
  if (action.type === "create") return [action.conversation, ...state];
  return state.map((conversation) => {
    if (conversation.id !== action.conversationId) return conversation;
    if (action.type === "append")
      return {
        ...conversation,
        messages: [...conversation.messages, action.message],
      };
    if (action.type === "typing")
      return { ...conversation, typing: action.value };
    return {
      ...conversation,
      messages: conversation.messages.map((message) => {
        if (message.id !== action.messageId) return message;
        if (action.type === "patch") return { ...message, ...action.patch };
        if (action.type === "delta")
          return { ...message, message: message.message + action.text };
        if (action.type === "react")
          return {
            ...message,
            reaction: message.reaction === action.emoji ? null : action.emoji,
          };
        if (
          action.type === "vote" &&
          message.poll &&
          message.poll.options.some((option) => option.id === action.optionId)
        )
          return {
            ...message,
            poll: {
              ...message.poll,
              vote:
                message.poll.vote === action.optionId ? null : action.optionId,
            },
          };
        return message;
      }),
    };
  });
}
export function validPoll(question, options) {
  const clean = options.map((option) => option.trim()).filter(Boolean);
  return (
    !!question.trim() &&
    clean.length >= 2 &&
    clean.length <= 5 &&
    new Set(clean.map((option) => option.toLocaleLowerCase())).size ===
      clean.length
  );
}
