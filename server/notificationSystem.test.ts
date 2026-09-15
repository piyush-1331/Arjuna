import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  dispatchNotification,
  getInAppNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationHistory,
  getNotificationPreferences,
  updateNotificationPreferences,
  getProviderStatusTelemetry,
} from "./notificationService";
import {
  EmailNotificationProvider,
  SmsNotificationProvider,
  WhatsAppNotificationProvider,
  InAppNotificationProvider,
  NotificationEventType,
} from "./notificationProviders";

function createMockAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-cdho",
      name: "Chief District Health Officer",
      email: "cdho@ahmedabad.gov.in",
      role: "administrator",
      loginMethod: "local",
      district: "Ahmedabad Rural",
      facilityId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("Complete Healthcare Notification System", () => {
  describe("8 Core Notification Event Types", () => {
    const all8Events: NotificationEventType[] = [
      "appointment_reminder",
      "follow_up_reminder",
      "overdue_follow_up",
      "referral_status",
      "medicine_availability",
      "low_stock",
      "health_campaign_assignment",
      "emergency_referral_alert",
    ];

    it("should successfully dispatch all 8 notification types across multi-channel providers", async () => {
      for (const eventType of all8Events) {
        const res = await dispatchNotification({
          eventType,
          recipientId: 1,
          recipientName: "Test Recipient",
          recipientEmail: "test@example.com",
          recipientPhone: "+91-9876543210",
          recipientWhatsApp: "+91-9876543210",
          title: `Test Event: ${eventType}`,
          message: `Testing dispatch for healthcare event ${eventType}`,
          priority: eventType.includes("emergency") ? "emergency" : "routine",
        });

        expect(res).toBeDefined();
        expect(res.inAppNotification).toBeDefined();
        expect(res.inAppNotification?.eventType).toBe(eventType);
        expect(res.deliveryResults.length).toBe(4); // in_app, sms, whatsapp, email
        expect(res.historyEntryId).toBeTruthy();
      }
    });
  });

  describe("Provider Abstractions & Transparent Mock Fallback", () => {
    it("should never falsely claim an external message was sent when gateway credentials are unconfigured", async () => {
      const email = new EmailNotificationProvider();
      const sms = new SmsNotificationProvider();
      const wa = new WhatsAppNotificationProvider();
      const inApp = new InAppNotificationProvider();

      const payload = {
        eventType: "appointment_reminder" as const,
        recipientName: "Ramesh Patel",
        recipientPhone: "+91-9876543210",
        recipientWhatsApp: "+91-9876543210",
        recipientEmail: "ramesh@example.gov.in",
        title: "Appointment Reminder",
        message: "Your PHC appointment is tomorrow at 10:00 AM.",
        priority: "routine" as const,
      };

      // 1. In-App Provider (Always live)
      const inAppResult = await inApp.send(payload);
      expect(inAppResult.channel).toBe("in_app");
      expect(inAppResult.status).toBe("delivered");
      expect(inAppResult.mode).toBe("live");

      // 2. Email Provider (Mock fallback when unconfigured)
      const emailResult = await email.send(payload);
      expect(emailResult.channel).toBe("email");
      if (!email.isConfigured) {
        expect(emailResult.status).toBe("simulated_mock");
        expect(emailResult.mode).toBe("mock_simulation");
        expect(emailResult.deliveryNote.toLowerCase()).toContain("not sent");
      }

      // 3. SMS Provider (Mock fallback when unconfigured)
      const smsResult = await sms.send(payload);
      expect(smsResult.channel).toBe("sms");
      if (!sms.isConfigured) {
        expect(smsResult.status).toBe("simulated_mock");
        expect(smsResult.mode).toBe("mock_simulation");
        expect(smsResult.deliveryNote.toLowerCase()).toContain("not sent");
      }

      // 4. WhatsApp Provider (Mock fallback when unconfigured)
      const waResult = await wa.send(payload);
      expect(waResult.channel).toBe("whatsapp");
      if (!wa.isConfigured) {
        expect(waResult.status).toBe("simulated_mock");
        expect(waResult.mode).toBe("mock_simulation");
        expect(waResult.deliveryNote.toLowerCase()).toContain("not sent");
      }
    });
  });

  describe("In-App Notifications & Read/Unread State Management", () => {
    it("should track unread count, mark single as read, and mark all as read", async () => {
      // 1. Dispatch new unread notification
      const dispatchRes = await dispatchNotification({
        eventType: "overdue_follow_up",
        recipientId: 1,
        recipientName: "Dr. CDHO",
        title: "Overdue Follow-up Test Alert",
        message: "Meena Patel's blood pressure follow-up is overdue.",
        priority: "high",
      });

      const notifId = dispatchRes.inAppNotification!.id;

      // 2. Fetch list
      const initialFeed = await getInAppNotifications(1);
      expect(initialFeed.notifications.length).toBeGreaterThan(0);
      expect(initialFeed.unreadCount).toBeGreaterThan(0);

      // 3. Mark single notification as read
      const markSingleRes = await markNotificationAsRead(notifId);
      expect(markSingleRes.success).toBe(true);
      expect(markSingleRes.readAt).toBeTruthy();

      // 4. Mark all as read
      const markAllRes = await markAllNotificationsAsRead(1);
      expect(markAllRes.success).toBe(true);

      const afterMarkAllFeed = await getInAppNotifications(1, { isRead: false });
      expect(afterMarkAllFeed.unreadCount).toBe(0);
      expect(afterMarkAllFeed.notifications.length).toBe(0);
    });

    it("should maintain comprehensive notification history audit trail", async () => {
      const history = await getNotificationHistory();
      expect(history.length).toBeGreaterThan(0);

      history.forEach((entry) => {
        expect(entry.id).toBeTruthy();
        expect(entry.eventType).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.channelsDispatched.length).toBeGreaterThan(0);
        expect(entry.deliveryResults.length).toBeGreaterThan(0);
        expect(entry.dispatchedAt).toBeTruthy();
      });
    });
  });

  describe("Notification Preferences", () => {
    it("should retrieve and update user channel and event preferences", async () => {
      const prefs = await getNotificationPreferences(1);
      expect(prefs).toBeDefined();
      expect(prefs.channels.inApp).toBe(true);
      expect(prefs.events.emergencyAlerts).toBe(true);

      const updated = await updateNotificationPreferences(1, {
        channels: { ...prefs.channels, sms: false },
        events: { ...prefs.events, lowStock: false },
        contactInfo: {
          phone: "+91-9988776655",
          whatsappNumber: "+91-9988776655",
          email: "cdho.ahmedabad@gujarat.gov.in",
          language: "gu",
        },
      });

      expect(updated.channels.sms).toBe(false);
      expect(updated.events.lowStock).toBe(false);
      expect(updated.contactInfo.language).toBe("gu");
      expect(updated.contactInfo.phone).toBe("+91-9988776655");
    });
  });

  describe("tRPC notifications Router", () => {
    it("should execute list, markAsRead, markAllAsRead, getHistory, getPreferences, sendTest, and getProviderStatus", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());

      // 1. List
      const list = await caller.notifications.list();
      expect(list.notifications.length).toBeGreaterThan(0);

      // 2. Provider Status Telemetry
      const providerStatus = await caller.notifications.getProviderStatus();
      expect(providerStatus.inApp.mode).toBe("live");
      expect(providerStatus.disclaimer).toBeTruthy();

      // 3. Send Test Notification
      const testRes = await caller.notifications.sendTest({
        eventType: "emergency_referral_alert",
        recipientName: "Field Team Leader",
        recipientPhone: "+91-9876543210",
        title: "Test Emergency 108 Dispatch",
        message: "Red-flag obstetric emergency dispatch test.",
        priority: "emergency",
        channels: ["in_app", "sms", "whatsapp", "email"],
      });
      expect(testRes.deliveryResults.length).toBe(4);

      // 4. Mark As Read
      if (testRes.inAppNotification) {
        const markRes = await caller.notifications.markAsRead({
          id: testRes.inAppNotification.id,
        });
        expect(markRes.success).toBe(true);
      }

      // 5. Get History
      const hist = await caller.notifications.getHistory();
      expect(hist.length).toBeGreaterThan(0);

      // 6. Preferences
      const prefs = await caller.notifications.getPreferences();
      expect(prefs.userId).toBe(1);
    });
  });
});
