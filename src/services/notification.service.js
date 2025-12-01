import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:satyajitnikam09@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

let pushSubscriptions = [];

/**
 * Save subscription for a user
 */
export function addSubscription(userId, subscription) {
  // Remove old if exists
  pushSubscriptions = pushSubscriptions.filter(
    (sub) => sub.userId !== userId
  );

  pushSubscriptions.push({ userId, subscription });
}

/**
 * Send push notification to all subscribers
 */
export function sendPushNotification(payload) {
  pushSubscriptions.forEach((sub, index) => {
    webpush
      .sendNotification(sub.subscription, JSON.stringify(payload))
      .catch((err) => {
        console.error("Push failed:", err);

        // Cleanup if subscription is dead
        if (err.statusCode === 410 || err.statusCode === 404) {
          pushSubscriptions.splice(index, 1);
        }
      });
  });
}
