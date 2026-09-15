/**
 * Notification Service & Dispatch Pipeline
 *
 * Coordinates multi-channel dispatches (In-App, SMS, WhatsApp, Email)
 * for all 8 core healthcare event types:
 * 1. appointment_reminder
 * 2. follow_up_reminder
 * 3. overdue_follow_up
 * 4. referral_status
 * 5. medicine_availability
 * 6. low_stock
 * 7. health_campaign_assignment
 * 8. emergency_referral_alert
 *
 * Implements in-app notifications, read/unread status, notification history,
 * user preferences, and transparent mock provider logging.
 */

import {
  NotificationChannel,
  NotificationEventType,
  NotificationPriority,
  NotificationDispatchPayload,
  NotificationDeliveryResult,
  EmailNotificationProvider,
  SmsNotificationProvider,
  WhatsAppNotificationProvider,
  InAppNotificationProvider,
} from "./notificationProviders";

export interface InAppNotification {
  id: number;
  userId?: number;
  patientId?: number;
  eventType: NotificationEventType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationHistoryEntry {
  id: string;
  eventType: NotificationEventType;
  recipientId?: number;
  recipientName: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  channelsDispatched: NotificationChannel[];
  deliveryResults: NotificationDeliveryResult[];
  dispatchedAt: string;
}

export interface NotificationPreferences {
  userId: number;
  channels: {
    inApp: boolean;
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
  };
  events: {
    appointmentReminder: boolean;
    followUpReminder: boolean;
    overdueFollowUp: boolean;
    referralStatus: boolean;
    medicineAvailability: boolean;
    lowStock: boolean;
    campaignAssignment: boolean;
    emergencyAlerts: boolean;
  };
  contactInfo: {
    phone?: string;
    whatsappNumber?: string;
    email?: string;
    language: "en" | "gu" | "hi";
  };
}

// In-Memory Storage
let memInAppNotifications: InAppNotification[] = [];
let memNotificationHistory: NotificationHistoryEntry[] = [];
const memPreferences: Map<number, NotificationPreferences> = new Map();

// Registered Providers
const emailProvider = new EmailNotificationProvider();
const smsProvider = new SmsNotificationProvider();
const whatsAppProvider = new WhatsAppNotificationProvider();
const inAppProvider = new InAppNotificationProvider();

/**
 * Initialize default in-app notifications & history seed
 */
function initNotificationStore() {
  if (memInAppNotifications.length > 0) return;

  const initialItems: InAppNotification[] = [
    {
      id: 1,
      userId: 1,
      patientId: 3,
      eventType: "emergency_referral_alert",
      title: "EMERGENCY 108 REFERRAL ALERT",
      message: "Asha Devi (Rampura) flagged with Critical Blood Pressure (172/104 mmHg). 108 Transport dispatched to Sanand CHC.",
      priority: "emergency",
      isRead: false,
      readAt: null,
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      metadata: { referralId: 1, village: "Rampura", bp: "172/104" },
    },
    {
      id: 2,
      userId: 1,
      patientId: 1,
      eventType: "overdue_follow_up",
      title: "Overdue Field Follow-up Alert",
      message: "Meena Patel's blood pressure and medication adherence check was due 48 hours ago. ASHA visit required.",
      priority: "high",
      isRead: false,
      readAt: null,
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      metadata: { followUpId: 2, patientName: "Meena Patel" },
    },
    {
      id: 3,
      userId: 1,
      patientId: 2,
      eventType: "appointment_reminder",
      title: "Appointment Reminder: General OPD",
      message: "Scheduled follow-up evaluation for Ramesh Kumar at Sundarpur PHC tomorrow at 10:30 AM.",
      priority: "routine",
      isRead: true,
      readAt: new Date(Date.now() - 10 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      metadata: { appointmentId: 1, facility: "Sundarpur PHC" },
    },
    {
      id: 4,
      userId: 1,
      patientId: 4,
      eventType: "follow_up_reminder",
      title: "Care Visit Reminder: High-Risk Antenatal",
      message: "Geeta Ben (Sundarpur) 3rd trimester antenatal home visit scheduled for Friday with ASHA Lead.",
      priority: "medium",
      isRead: true,
      readAt: new Date(Date.now() - 18 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      metadata: { gestationalWeek: 32 },
    },
    {
      id: 5,
      userId: 1,
      eventType: "low_stock",
      title: "Pharmacy Reorder Threshold Alert",
      message: "Amlodipine 5mg and Metformin 500mg are below minimum buffer threshold at Sundarpur PHC Pharmacy.",
      priority: "high",
      isRead: false,
      readAt: null,
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      metadata: { facilityId: 1, sku: "Amlodipine 5mg" },
    },
    {
      id: 6,
      userId: 1,
      eventType: "medicine_availability",
      title: "Medicine Restock Notification",
      message: "Telmisartan 40mg (200 strips) has been restocked and verified at Sanand CHC Pharmacy.",
      priority: "routine",
      isRead: true,
      readAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      metadata: { medicineName: "Telmisartan 40mg", quantity: 200 },
    },
    {
      id: 7,
      userId: 1,
      eventType: "health_campaign_assignment",
      title: "Campaign Staffing Assignment",
      message: "You have been assigned to 'Mukhyamantri Diabetes Screening Drive' covering Sundarpur & Rampura blocks.",
      priority: "medium",
      isRead: false,
      readAt: null,
      createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
      metadata: { campaignId: 1, campaignName: "Mukhyamantri Diabetes Screening Drive" },
    },
    {
      id: 8,
      userId: 1,
      patientId: 3,
      eventType: "referral_status",
      title: "Referral Status Update: Arrived at Facility",
      message: "Patient Asha Devi has safely arrived at Sanand CHC Emergency Desk for specialist consultation.",
      priority: "medium",
      isRead: true,
      readAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      metadata: { referralId: 1, status: "ARRIVED" },
    },
  ];

  memInAppNotifications = initialItems;

  // Initial history seed
  memNotificationHistory = initialItems.map((n) => ({
    id: `hist-${n.id}`,
    eventType: n.eventType,
    recipientId: n.userId,
    recipientName: "Chief District Health Officer / Field Staff",
    title: n.title,
    message: n.message,
    priority: n.priority,
    channelsDispatched: ["in_app", "sms", "whatsapp"],
    deliveryResults: [
      {
        channel: "in_app",
        providerName: inAppProvider.providerName,
        status: "delivered",
        mode: "live",
        deliveredAt: n.createdAt,
        messageId: `inapp-${n.id}`,
        deliveryNote: "In-App notification recorded.",
      },
      {
        channel: "sms",
        providerName: smsProvider.providerName,
        status: "simulated_mock",
        mode: "mock_simulation",
        deliveredAt: n.createdAt,
        messageId: `mock-sms-${n.id}`,
        deliveryNote: "Mock SMS Provider: Gateway credentials not configured. Simulated dispatch. External SMS was NOT sent.",
      },
      {
        channel: "whatsapp",
        providerName: whatsAppProvider.providerName,
        status: "simulated_mock",
        mode: "mock_simulation",
        deliveredAt: n.createdAt,
        messageId: `mock-wa-${n.id}`,
        deliveryNote: "Mock WhatsApp Provider: WhatsApp API not configured. Simulated dispatch. External WhatsApp was NOT sent.",
      },
    ],
    dispatchedAt: n.createdAt,
  }));
}

initNotificationStore();

/**
 * Get default preferences for a user
 */
export function getDefaultPreferences(userId: number): NotificationPreferences {
  return {
    userId,
    channels: {
      inApp: true,
      sms: true,
      whatsapp: true,
      email: true,
    },
    events: {
      appointmentReminder: true,
      followUpReminder: true,
      overdueFollowUp: true,
      referralStatus: true,
      medicineAvailability: true,
      lowStock: true,
      campaignAssignment: true,
      emergencyAlerts: true,
    },
    contactInfo: {
      phone: "+91-9876543210",
      whatsappNumber: "+91-9876543210",
      email: "healthofficer@ahmedabad.gujarat.gov.in",
      language: "en",
    },
  };
}

/**
 * Core Dispatch Engine: Sends a notification across all enabled channels
 */
export async function dispatchNotification(
  payload: NotificationDispatchPayload,
  channelsToDispatch: NotificationChannel[] = ["in_app", "sms", "whatsapp", "email"]
): Promise<{
  inAppNotification: InAppNotification | null;
  deliveryResults: NotificationDeliveryResult[];
  historyEntryId: string;
}> {
  const deliveryResults: NotificationDeliveryResult[] = [];
  let inAppRecord: InAppNotification | null = null;
  const dispatchedAt = new Date().toISOString();

  // 1. Dispatch In-App if requested
  if (channelsToDispatch.includes("in_app")) {
    const inAppResult = await inAppProvider.send(payload);
    deliveryResults.push(inAppResult);

    const newId = memInAppNotifications.length + 1;
    inAppRecord = {
      id: newId,
      userId: payload.recipientId,
      patientId: payload.metadata?.patientId as number | undefined,
      eventType: payload.eventType,
      title: payload.title,
      message: payload.message,
      priority: payload.priority,
      isRead: false,
      readAt: null,
      createdAt: dispatchedAt,
      metadata: payload.metadata,
    };
    memInAppNotifications.unshift(inAppRecord);
  }

  // 2. Dispatch SMS
  if (channelsToDispatch.includes("sms")) {
    const smsResult = await smsProvider.send(payload);
    deliveryResults.push(smsResult);
  }

  // 3. Dispatch WhatsApp
  if (channelsToDispatch.includes("whatsapp")) {
    const waResult = await whatsAppProvider.send(payload);
    deliveryResults.push(waResult);
  }

  // 4. Dispatch Email
  if (channelsToDispatch.includes("email")) {
    const emailResult = await emailProvider.send(payload);
    deliveryResults.push(emailResult);
  }

  // 5. Record to Notification History
  const historyEntryId = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const historyEntry: NotificationHistoryEntry = {
    id: historyEntryId,
    eventType: payload.eventType,
    recipientId: payload.recipientId,
    recipientName: payload.recipientName,
    title: payload.title,
    message: payload.message,
    priority: payload.priority,
    channelsDispatched: channelsToDispatch,
    deliveryResults,
    dispatchedAt,
  };
  memNotificationHistory.unshift(historyEntry);

  return {
    inAppNotification: inAppRecord,
    deliveryResults,
    historyEntryId,
  };
}

/**
 * In-App Notification Query Methods
 */
export async function getInAppNotifications(
  userId?: number,
  filter?: {
    isRead?: boolean;
    eventType?: NotificationEventType;
    priority?: NotificationPriority;
  }
): Promise<{
  notifications: InAppNotification[];
  unreadCount: number;
  totalCount: number;
}> {
  let list = [...memInAppNotifications];

  if (userId) {
    list = list.filter((n) => !n.userId || n.userId === userId);
  }

  if (filter) {
    if (typeof filter.isRead === "boolean") {
      list = list.filter((n) => n.isRead === filter.isRead);
    }
    if (filter.eventType) {
      list = list.filter((n) => n.eventType === filter.eventType);
    }
    if (filter.priority) {
      list = list.filter((n) => n.priority === filter.priority);
    }
  }

  const unreadCount = memInAppNotifications.filter(
    (n) => (!userId || !n.userId || n.userId === userId) && !n.isRead
  ).length;

  return {
    notifications: list,
    unreadCount,
    totalCount: list.length,
  };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: number
): Promise<{ success: boolean; readAt: string }> {
  const item = memInAppNotifications.find((n) => n.id === notificationId);
  if (!item) {
    throw new Error(`Notification #${notificationId} not found.`);
  }

  const readAt = new Date().toISOString();
  item.isRead = true;
  item.readAt = readAt;

  return { success: true, readAt };
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId?: number
): Promise<{ success: boolean; markedCount: number }> {
  const readAt = new Date().toISOString();
  let count = 0;

  memInAppNotifications.forEach((n) => {
    if ((!userId || !n.userId || n.userId === userId) && !n.isRead) {
      n.isRead = true;
      n.readAt = readAt;
      count++;
    }
  });

  return { success: true, markedCount: count };
}

/**
 * Get Notification Dispatch History
 */
export async function getNotificationHistory(
  eventType?: NotificationEventType
): Promise<NotificationHistoryEntry[]> {
  if (eventType) {
    return memNotificationHistory.filter((h) => h.eventType === eventType);
  }
  return [...memNotificationHistory];
}

/**
 * Get User Notification Preferences
 */
export async function getNotificationPreferences(
  userId = 1
): Promise<NotificationPreferences> {
  const existing = memPreferences.get(userId);
  if (existing) return existing;

  const defaultPref = getDefaultPreferences(userId);
  memPreferences.set(userId, defaultPref);
  return defaultPref;
}

/**
 * Update User Notification Preferences
 */
export async function updateNotificationPreferences(
  userId: number,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(userId);
  const updated: NotificationPreferences = {
    ...current,
    ...updates,
    channels: {
      ...current.channels,
      ...(updates.channels || {}),
    },
    events: {
      ...current.events,
      ...(updates.events || {}),
    },
    contactInfo: {
      ...current.contactInfo,
      ...(updates.contactInfo || {}),
    },
  };

  memPreferences.set(userId, updated);
  return updated;
}

/**
 * Get Provider Status Telemetry (Live vs Mock status)
 */
export function getProviderStatusTelemetry() {
  return {
    inApp: {
      name: inAppProvider.providerName,
      channel: "in_app" as const,
      isConfigured: inAppProvider.isConfigured,
      mode: "live" as const,
      status: "ACTIVE",
    },
    email: {
      name: emailProvider.providerName,
      channel: "email" as const,
      isConfigured: emailProvider.isConfigured,
      mode: emailProvider.isConfigured ? ("live" as const) : ("mock_simulation" as const),
      status: emailProvider.isConfigured ? "CONFIGURED (LIVE)" : "SIMULATED MOCK (Credentials unconfigured)",
    },
    sms: {
      name: smsProvider.providerName,
      channel: "sms" as const,
      isConfigured: smsProvider.isConfigured,
      mode: smsProvider.isConfigured ? ("live" as const) : ("mock_simulation" as const),
      status: smsProvider.isConfigured ? "CONFIGURED (LIVE)" : "SIMULATED MOCK (Gateway unconfigured)",
    },
    whatsapp: {
      name: whatsAppProvider.providerName,
      channel: "whatsapp" as const,
      isConfigured: whatsAppProvider.isConfigured,
      mode: whatsAppProvider.isConfigured ? ("live" as const) : ("mock_simulation" as const),
      status: whatsAppProvider.isConfigured ? "CONFIGURED (LIVE)" : "SIMULATED MOCK (API token unconfigured)",
    },
    disclaimer:
      "All simulated mock channels transparently indicate mock delivery status. External messages are only dispatched when valid gateway credentials are provided.",
  };
}
