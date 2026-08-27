const JAKARTA_HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  hourCycle: "h23",
});

function isHour(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 23
  );
}

/**
 * Applies payment_accounts operating hours in Asia/Jakarta.
 * null/null means always available; incomplete, invalid, and equal-hour
 * configurations fail closed. Equal hours do not have a proven 24-hour meaning.
 */
export function isDepositPaymentAvailableNow(
  startHour: unknown,
  endHour: unknown,
) {
  if (startHour === null && endHour === null) {
    return true;
  }

  if (!isHour(startHour) || !isHour(endHour) || startHour === endHour) {
    return false;
  }

  const hourPart = JAKARTA_HOUR_FORMATTER.formatToParts(new Date()).find(
    (part) => part.type === "hour",
  )?.value;
  const currentHour = Number(hourPart);

  if (!Number.isInteger(currentHour)) {
    return false;
  }

  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  }

  return currentHour >= startHour || currentHour < endHour;
}
