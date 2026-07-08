const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyOnNewTarget = onDocumentUpdated("campaigns/{campaignId}", async (event) => {
  const newValue = event.data.after.data();
  const previousValue = event.data.before.data();

  // We only want to trigger this if the target_count has actually changed.
  if (newValue.target_count === previousValue.target_count) {
    return null;
  }

  console.log(`Target count changed to ${newValue.target_count}. Sending broadcast notification.`);

  const payload = {
    notification: {
      title: "New Swalath Target! 🌟",
      body: `The admin has set a new target of ${newValue.target_count}. Let's count together!`,
    },
    topic: "all_users", // To use this, all apps must subscribe to "all_users" on launch
  };

  try {
    const response = await admin.messaging().send(payload);
    console.log("Successfully sent message:", response);
  } catch (error) {
    console.error("Error sending message:", error);
  }
});

exports.handleUserPasswordReset = onDocumentUpdated("users/{userId}", async (event) => {
  const newValue = event.data.after.data();
  const previousValue = event.data.before ? event.data.before.data() : {};

  // Check if admin set a temporary password field in Firestore
  if (newValue && newValue.temp_password && newValue.temp_password !== previousValue.temp_password) {
    const userId = event.params.userId;
    const newPassword = newValue.temp_password;

    console.log(`Received password reset request for user: ${userId}`);

    try {
      // Update password in Firebase Auth using the Admin SDK
      await admin.auth().updateUser(userId, {
        password: newPassword
      });

      console.log(`Successfully updated auth password for user: ${userId}`);

      // Delete the temp_password field from Firestore so it doesn't store in plain text
      const db = admin.firestore();
      await db.collection("users").doc(userId).update({
        temp_password: admin.firestore.FieldValue.delete(),
        password_reset_error: admin.firestore.FieldValue.delete()
      });
      
    } catch (error) {
      console.error(`Error updating password for user ${userId}:`, error);
      
      const db = admin.firestore();
      await db.collection("users").doc(userId).update({
        temp_password: admin.firestore.FieldValue.delete(),
        password_reset_error: error.message
      });
    }
  }
  return null;
});
