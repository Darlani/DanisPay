export type DanaQRResult = {
  qr: string;
  amount: number;
  crc: string;
  crcValid: boolean;
  length: number;
};

type TLV = {
  tag: string;
  length: number;
  value: string;
};

/**
 * Parse TLV QRIS.
 */
function parseTLV(
  input: string
): TLV[] {
  const result: TLV[] = [];

  let pos = 0;

  while (pos < input.length) {
    if (pos + 4 > input.length) {
      throw new Error(
        `TLV tidak lengkap pada posisi ${pos}.`
      );
    }

    const tag =
      input.substring(
        pos,
        pos + 2
      );

    const length =
      Number(
        input.substring(
          pos + 2,
          pos + 4
        )
      );

    if (!Number.isInteger(length)) {
      throw new Error(
        `Length tag ${tag} tidak valid.`
      );
    }

    const valueStart =
      pos + 4;

    const valueEnd =
      valueStart + length;

    if (
      valueEnd >
      input.length
    ) {
      throw new Error(
        `Tag ${tag} melebihi panjang QRIS.`
      );
    }

    result.push({
      tag,
      length,
      value:
        input.substring(
          valueStart,
          valueEnd
        ),
    });

    pos = valueEnd;
  }

  return result;
}

/**
 * Encode TLV.
 */
function encodeTLV(
  tag: string,
  value: string
): string {
  const length =
    value.length;

  if (length > 99) {
    throw new Error(
      `Value tag ${tag} terlalu panjang.`
    );
  }

  return (
    `${tag}` +
    `${String(length).padStart(
      2,
      "0"
    )}` +
    value
  );
}

/**
 * CRC-16/CCITT-FALSE
 */
function crc16ccittFalse(
  input: string
): string {
  let crc = 0xffff;

  for (
    let i = 0;
    i < input.length;
    i++
  ) {
    crc ^=
      input.charCodeAt(i) << 8;

    for (
      let bit = 0;
      bit < 8;
      bit++
    ) {
      if (
        (crc & 0x8000) !==
        0
      ) {
        crc =
          ((crc << 1) ^
            0x1021) &
          0xffff;
      } else {
        crc =
          (crc << 1) &
          0xffff;
      }
    }
  }

  return crc
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
}

/**
 * Parse QRIS tetapi berhenti
 * sebelum Tag 63.
 */
function parseWithoutCRC(
  input: string
): TLV[] {
  const result: TLV[] = [];

  let pos = 0;

  while (pos < input.length) {
    if (pos + 4 > input.length) {
      throw new Error(
        `QRIS tidak lengkap pada posisi ${pos}.`
      );
    }

    const tag =
      input.substring(
        pos,
        pos + 2
      );

    const length =
      Number(
        input.substring(
          pos + 2,
          pos + 4
        )
      );

    if (!Number.isInteger(length)) {
      throw new Error(
        `Length tag ${tag} tidak valid.`
      );
    }

    if (tag === "63") {
      if (length !== 4) {
        throw new Error(
          "Tag 63 QRIS harus memiliki length 04."
        );
      }

      return result;
    }

    const valueStart =
      pos + 4;

    const valueEnd =
      valueStart + length;

    if (
      valueEnd >
      input.length
    ) {
      throw new Error(
        `Tag ${tag} melebihi panjang QRIS.`
      );
    }

    result.push({
      tag,
      length,
      value:
        input.substring(
          valueStart,
          valueEnd
        ),
    });

    pos = valueEnd;
  }

  return result;
}

/**
 * Konversi Tag 26 DANA static
 * menjadi pola dynamic.
 *
 * STATIC:
 * 936009153000887502
 *
 * DYNAMIC:
 * 936009150000887502
 */
function convertDanaTag26(
  value: string
): string {
  const nested =
    parseTLV(value);

  return nested
    .map((item) => {
      if (
        item.tag === "01" &&
        item.value ===
          "936009153000887502"
      ) {
        return encodeTLV(
          "01",
          "936009150000887502"
        );
      }

      return encodeTLV(
        item.tag,
        item.value
      );
    })
    .join("");
}

/**
 * Generator QRIS Dynamic DANA.
 */
export function generateDanaDynamicQR(
  staticQR: string,
  amount: number
): DanaQRResult {
  const cleanQR =
    staticQR.trim();

  if (!cleanQR) {
    throw new Error(
      "QRIS static kosong."
    );
  }

  if (
    !Number.isFinite(amount)
  ) {
    throw new Error(
      "Nominal tidak valid."
    );
  }

  if (
    !Number.isInteger(amount)
  ) {
    throw new Error(
      "Nominal harus berupa bilangan bulat."
    );
  }

  if (amount <= 0) {
    throw new Error(
      "Nominal harus lebih besar dari 0."
    );
  }

  if (
    amount >
    999999999
  ) {
    throw new Error(
      "Nominal terlalu besar."
    );
  }

  const tags =
    parseWithoutCRC(
      cleanQR
    );

  const poi =
    tags.find(
      (item) =>
        item.tag === "01"
    );

  if (!poi) {
    throw new Error(
      "Tag 01 tidak ditemukan."
    );
  }

  if (
    poi.value !== "11"
  ) {
    throw new Error(
      `QR input bukan static QRIS. Tag 01 = ${poi.value}`
    );
  }

  const tag26 =
    tags.find(
      (item) =>
        item.tag === "26"
    );

  if (!tag26) {
    throw new Error(
      "Tag 26 tidak ditemukan."
    );
  }

  const dynamicTag26 =
    convertDanaTag26(
      tag26.value
    );

  const generated: string[] =
    [];

  for (const tag of tags) {
    /**
     * STATIC 11 → DYNAMIC 12
     */
    if (tag.tag === "01") {
      generated.push(
        encodeTLV(
          "01",
          "12"
        )
      );

      continue;
    }

    /**
     * Tag 26 DANA
     */
    if (tag.tag === "26") {
      generated.push(
        encodeTLV(
          "26",
          dynamicTag26
        )
      );

      continue;
    }

    /**
     * Jangan copy Tag 54.
     */
    if (tag.tag === "54") {
      continue;
    }

    /**
     * Jangan copy Tag 62.
     */
    if (tag.tag === "62") {
      continue;
    }

    /**
     * CRC dibuat ulang.
     */
    if (tag.tag === "63") {
      continue;
    }

    generated.push(
      encodeTLV(
        tag.tag,
        tag.value
      )
    );
  }

  /**
   * Tag 54 nominal.
   */
  const amountTLV =
    encodeTLV(
      "54",
      String(amount)
    );

  /**
   * Tag 54 setelah Tag 53.
   */
  const result: string[] =
    [];

  for (const item of generated) {
    result.push(item);

    const tag =
      item.substring(0, 2);

    if (tag === "53") {
      result.push(
        amountTLV
      );
    }
  }

  /**
   * Tag 62 DANA.
   *
   * 62 19
   * 60 15
   * 0011ID.DANA.WWW
   */
  const tag62Value =
    encodeTLV(
      "60",
      "0011ID.DANA.WWW"
    );

  result.push(
    encodeTLV(
      "62",
      tag62Value
    )
  );

  /**
   * Payload sebelum CRC.
   */
  const payload =
    result.join("") +
    "6304";

  /**
   * CRC baru.
   */
  const crc =
    crc16ccittFalse(
      payload
    );

  const qr =
    payload + crc;

  /**
   * Validasi CRC.
   */
  const verifyCRC =
    crc16ccittFalse(
      qr.substring(
        0,
        qr.length - 4
      )
    );

  return {
    qr,
    amount,
    crc,
    crcValid:
      verifyCRC === crc,
    length:
      qr.length,
  };
}