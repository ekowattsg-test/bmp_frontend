import { request } from "./axios_helper";

const isSameStaff = (a, b) => {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
};

/**
 * Resolves the current user's staffId and mobile number for messaging,
 * mirroring the logic in MessagesPage.
 * @param {object} userInfo - user info from AuthContext (or PDA user).
 * @returns {Promise<{staffId: string|null, mobileNumber: string|null}|null>}
 */
export const resolveCurrentUserForMessaging = async (userInfo = {}) => {
  let mobile =
    userInfo?.mobileNumber || userInfo?.mobile || userInfo?.phoneNumber || "";
  let staffId = userInfo?.staffId || userInfo?.staffID || null;

  try {
    const res = await request("GET", "/api/staffs", null, {
      skipBackendErrorDialog: true,
    });
    const staffRows = res.data || [];
    const userMobile = String(mobile || "").trim();
    const me =
      staffRows.find(
        (s) => s.staffId && staffId && isSameStaff(s.staffId, staffId),
      ) ||
      staffRows.find(
        (s) => s.staffId && userInfo?.id && isSameStaff(s.staffId, userInfo.id),
      ) ||
      staffRows.find(
        (s) =>
          userMobile &&
          (String(s.mobileNumber || "").trim() === userMobile ||
            String(s.mobile || "").trim() === userMobile ||
            String(s.phoneNumber || "").trim() === userMobile),
      );
    if (me) {
      mobile = mobile || me.mobileNumber || me.mobile || me.phoneNumber || "";
      staffId = staffId || me.staffId || null;
    }
  } catch (err) {
    console.error("Failed to resolve current user for messaging", err);
  }

  mobile = String(mobile || "").trim();
  staffId = staffId || null;

  if (!mobile || !staffId) return null;
  return { staffId, mobileNumber: mobile };
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

/**
 * Builds the message content for a READY purchase order.
 * @param {object} order - purchase order record.
 * @param {string} readyDate - ready date string.
 * @param {Function} t - i18n translate function.
 * @returns {string}
 */
export const buildPurchaseOrderReadyMessage = (order, readyDate, t) => {
  const orderId = order?.orderId || "";
  const encodedOrderId = encodeURIComponent(orderId);
  const vendorName = order?.vendorName || order?.vendorId || "";
  return t("purchaseOrderList.action.readyMessage", {
    orderId,
    encodedOrderId,
    vendorName,
    readyDate: formatDate(readyDate),
  });
};

/**
 * Builds the message content for an ISSUED delivery order.
 * @param {object} order - delivery order record.
 * @param {string} issuedDate - issued date string.
 * @param {Function} t - i18n translate function.
 * @returns {string}
 */
export const buildDeliveryOrderIssuedMessage = (order, issuedDate, t) => {
  const orderId = order?.orderId || "";
  const encodedOrderId = encodeURIComponent(orderId);
  const projectCode = order?.projectCode || "—";
  return t("deliveryOrderList.action.issueMessage", {
    orderId,
    encodedOrderId,
    projectCode,
    issuedDate: formatDate(issuedDate),
  });
};

/**
 * Sends a direct message to a staff member.
 * @param {object} currentUser - { staffId, mobileNumber }.
 * @param {string} recipientStaffId - target staff id.
 * @param {string} content - message body.
 * @returns {Promise<void>}
 */
export const sendDirectMessage = async (
  currentUser,
  recipientStaffId,
  content,
) => {
  if (
    !currentUser?.mobileNumber ||
    !currentUser?.staffId ||
    !recipientStaffId
  ) {
    throw new Error("Missing messaging credentials");
  }
  const encodedMobile = encodeURIComponent(currentUser.mobileNumber);
  const payload = {
    recipientType: "DIRECT",
    recipientStaffId: String(recipientStaffId).trim(),
    content: String(content || "").trim(),
  };
  await request(
    "POST",
    `/api/messages?mobileNumber=${encodedMobile}`,
    payload,
    { skipBackendErrorDialog: true },
  );
};
