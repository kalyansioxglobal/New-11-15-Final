import { notifyUser, notifyAllDispatchers } from "@/pages/api/dispatch/notifications/stream";

export type DispatchNotification = {
  type: "NEW_MESSAGE" | "CONVERSATION_CLAIMED" | "CONVERSATION_RELEASED" | "NEW_CONVERSATION";
  conversationId: number;
  message?: string;
  fromAddress?: string;
  channel?: string;
  dispatcherId?: number;
  dispatcherName?: string;
};

export function sendNewMessageNotification(
  ventureId: number,
  notification: DispatchNotification
) {
  notifyAllDispatchers(ventureId, "dispatch_notification", notification);
}

export function sendConversationClaimedNotification(
  ventureId: number,
  conversationId: number,
  dispatcherId: number,
  dispatcherName: string
) {
  notifyAllDispatchers(ventureId, "dispatch_notification", {
    type: "CONVERSATION_CLAIMED",
    conversationId,
    dispatcherId,
    dispatcherName,
  });
}

export function sendConversationReleasedNotification(
  ventureId: number,
  conversationId: number
) {
  notifyAllDispatchers(ventureId, "dispatch_notification", {
    type: "CONVERSATION_RELEASED",
    conversationId,
  });
}
