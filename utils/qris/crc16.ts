import type { CRCResult } from "./types";

/**
 * CRC-16/CCITT-FALSE
 *
 * Polynomial : 0x1021
 * Initial    : 0xFFFF
 * Final XOR  : 0x0000
 */
export function calculateCRC16(
  input: string
): string {
  let crc = 0xffff;

  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc =
          ((crc << 1) ^ 0x1021) &
          0xffff;
      } else {
        crc =
          (crc << 1) & 0xffff;
      }
    }
  }

  return crc
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
}

/**
 * Verifikasi CRC QRIS.
 *
 * Tidak menghapus whitespace internal.
 * Hanya trim bagian luar.
 */
export function verifyCRC16(
  qris: string
): CRCResult {
  const clean = qris.trim();

  if (clean.length < 8) {
    return {
      valid: false,
      expected: "",
      actual: "",
    };
  }

  /**
   * Format CRC QRIS:
   *
   * 6304XXXX
   *
   * 63   = Tag
   * 04   = Length
   * XXXX = CRC
   */

  const crcTagPosition =
    clean.lastIndexOf("6304");

  if (
    crcTagPosition === -1 ||
    crcTagPosition + 8 >
      clean.length
  ) {
    return {
      valid: false,
      expected: "",
      actual: "",
    };
  }

  const crcInput =
    clean.substring(
      0,
      crcTagPosition + 4
    );

  const actual =
    clean.substring(
      crcTagPosition + 4,
      crcTagPosition + 8
    );

  const expected =
    calculateCRC16(crcInput);

  return {
    valid:
      expected.toUpperCase() ===
      actual.toUpperCase(),

    expected,
    actual,
  };
}