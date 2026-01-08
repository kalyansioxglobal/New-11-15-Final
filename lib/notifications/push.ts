/**
 * Push notification to user via SSE if available.
 * This is a non-blocking operation - failures are logged but don't affect notification creation.
 * 
 * Note: In serverless environments, this requires the notification creation and SSE stream
 * to be in the same function instance. The SSE connection keeps the function warm.
 */
export async function pushNotificationViaSSE(userId: number, notification: any) {
  try {
    const streamModule = await import("@/pages/api/notifications/stream");
    if (streamModule?.pushNotificationToUser) {
      streamModule.pushNotificationToUser(userId, notification);
    }
  } catch (error: any) {
    console.error("[SSE Push] Failed to push notification:", error?.message || error);
  }
}

/**
 * Push updated unread count to user via SSE.
 * 
 * Note: In serverless environments, this requires the notification creation and SSE stream
 * to be in the same function instance. The SSE connection keeps the function warm.
 */
export async function pushUnreadCountViaSSE(userId: number, unreadCount: number) {
  try {
    const streamModule = await import("@/pages/api/notifications/stream");
    if (streamModule?.pushUnreadCountToUser) {
      streamModule.pushUnreadCountToUser(userId, unreadCount);
    }
  } catch (error: any) {
    console.error("[SSE Push] Failed to push unread count:", error?.message || error);
  }
}

