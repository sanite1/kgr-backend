import { sendLowStockMail } from "../services/nodemailer/mail.service";

const NOTIFICATION_EMAIL =
  process.env.CONTACT_NOTIFICATION_EMAIL || "info@kgrpartnersltd.com";

// The fields the alert needs; both inventory and warehouse items fit.
interface LowStockItem {
  name: string;
  unit: string;
  quantityOnHand: number;
  minLevel: number;
}

// Emails the operations inbox ONCE when stock crosses from above the
// threshold to at/below it. Movements that stay below the line stay
// silent, so a hovering item cannot spam the inbox.
export const alertIfLowStock = (
  item: LowStockItem,
  previousQuantity: number,
): void => {
  if (
    previousQuantity > item.minLevel &&
    item.quantityOnHand <= item.minLevel
  ) {
    void sendLowStockMail(NOTIFICATION_EMAIL, {
      itemName: item.name,
      quantity: item.quantityOnHand,
      unit: item.unit,
      minLevel: item.minLevel,
    });
  }
};
