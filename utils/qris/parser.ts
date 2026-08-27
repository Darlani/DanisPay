import type {
  TLV,
  QRISData,
  MerchantAccountInfo,
} from "./types";

const TAG_NAMES: Record<
  string,
  string
> = {
  "00": "Payload Format Indicator",
  "01": "Point of Initiation Method",

  "02": "Visa",
  "03": "Mastercard",
  "04": "Mastercard",
  "15": "Visa",

  "26": "Merchant Account Information",
  "27": "Merchant Account Information",
  "28": "Merchant Account Information",
  "29": "Merchant Account Information",
  "30": "Merchant Account Information",
  "31": "Merchant Account Information",
  "32": "Merchant Account Information",
  "33": "Merchant Account Information",
  "34": "Merchant Account Information",
  "35": "Merchant Account Information",
  "36": "Merchant Account Information",
  "37": "Merchant Account Information",
  "38": "Merchant Account Information",
  "39": "Merchant Account Information",
  "40": "Merchant Account Information",
  "41": "Merchant Account Information",
  "42": "Merchant Account Information",
  "43": "Merchant Account Information",
  "44": "Merchant Account Information",
  "45": "Merchant Account Information",
  "46": "Merchant Account Information",
  "47": "Merchant Account Information",
  "48": "Merchant Account Information",
  "49": "Merchant Account Information",
  "50": "Merchant Account Information",
  "51": "Merchant Account Information",

  "52": "Merchant Category Code",
  "53": "Transaction Currency",
  "54": "Transaction Amount",
  "55": "Tip or Convenience Indicator",
  "56": "Value of Convenience Fee (Fixed)",
  "57": "Value of Convenience Fee (%)",
  "58": "Country Code",
  "59": "Merchant Name",
  "60": "Merchant City",
  "61": "Postal Code",
  "62": "Additional Data Field",
  "63": "CRC",
};

const NESTED_TAGS = new Set([
  ...Array.from(
    { length: 26 },
    (_, index) =>
      String(index + 26).padStart(2, "0")
  ),
  "62",
]);

/**
 * Parse TLV QRIS.
 *
 * Tidak menghapus whitespace internal.
 */
export function parseTLV(
  data: string
): TLV[] {
  const elements: TLV[] = [];

  let pos = 0;

  while (pos < data.length) {
    if (pos + 4 > data.length) {
      break;
    }

    const tag =
      data.substring(pos, pos + 2);

    const lengthString =
      data.substring(pos + 2, pos + 4);

    const length =
      Number(lengthString);

    if (!Number.isInteger(length)) {
      break;
    }

    const valueStart = pos + 4;
    const valueEnd =
      valueStart + length;

    if (valueEnd > data.length) {
      break;
    }

    const value =
      data.substring(
        valueStart,
        valueEnd
      );

    const name =
      TAG_NAMES[tag] ??
      `Unknown (${tag})`;

    const element: TLV = {
      tag,
      name,
      length,
      value,
    };

    if (
      NESTED_TAGS.has(tag) &&
      tag !== "63"
    ) {
      const children =
        parseTLV(value);

      if (children.length > 0) {
        element.children =
          children;
      }
    }

    elements.push(element);

    pos = valueEnd;
  }

  return elements;
}

/**
 * Parse QRIS menjadi struktur data
 */
export function parseQRIS(
  qrisString: string
): QRISData {
  const clean =
    qrisString.trim();

  const raw =
    parseTLV(clean);

  const findTag = (
    tag: string
  ) =>
    raw.find(
      (item) =>
        item.tag === tag
    );

  const methodValue =
    findTag("01")?.value;

  let method:
    | "static"
    | "dynamic"
    | "unknown" =
    "unknown";

  if (methodValue === "11") {
    method = "static";
  } else if (
    methodValue === "12"
  ) {
    method = "dynamic";
  }

  const tipIndicatorValue =
    findTag("55")?.value;

  let tipIndicator:
    | QRISData["tipIndicator"]
    | undefined;

  if (
    tipIndicatorValue === "01"
  ) {
    tipIndicator = "prompt";
  } else if (
    tipIndicatorValue === "02"
  ) {
    tipIndicator = "fixed";
  } else if (
    tipIndicatorValue === "03"
  ) {
    tipIndicator = "percentage";
  }

  const merchantAccountInfo:
    MerchantAccountInfo[] =
    raw
      .filter((item) => {
        const tagNum =
          Number(item.tag);

        return (
          tagNum >= 26 &&
          tagNum <= 51 &&
          !!item.children
        );
      })
      .map((item) => {
        const children =
          item.children ?? [];

        const findChild = (
          tag: string
        ) =>
          children.find(
            (child) =>
              child.tag === tag
          );

        return {
          tag: item.tag,

          globallyUniqueId:
            findChild("00")
              ?.value ?? "",

          merchantId:
            findChild("01")
              ?.value ??
            findChild("02")
              ?.value,

          merchantCriteria:
            findChild("03")
              ?.value,

          fields: children,
        };
      });

  return {
    version:
      findTag("00")?.value ?? "",

    method,

    merchantName:
      findTag("59")?.value ?? "",

    merchantCity:
      findTag("60")?.value ?? "",

    merchantCategoryCode:
      findTag("52")?.value ?? "",

    currency:
      findTag("53")?.value ?? "",

    amount:
      findTag("54")?.value,

    merchantAccountInfo,

    tipIndicator,

    tipFixed:
      findTag("56")?.value,

    tipPercentage:
      findTag("57")?.value,

    countryCode:
      findTag("58")?.value ?? "",

    postalCode:
      findTag("61")?.value ?? "",

    additionalData:
      findTag("62")?.children,

    crc:
      findTag("63")?.value ?? "",

    raw,
  };
}