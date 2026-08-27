import {
  parseTLV,
  parseQRIS,
} from "./parser";

import {
  verifyCRC16,
} from "./crc16";

import type {
  TLV,
  TLVDiff,
  CharacterDifference,
} from "./types";

function indexTLV(
  elements: TLV[],
  prefix = ""
): Map<string, TLV> {
  const map =
    new Map<string, TLV>();

  elements.forEach(
    (element) => {
      const path = prefix
        ? `${prefix}.${element.tag}`
        : element.tag;

      map.set(
        path,
        element
      );

      if (element.children) {
        const childMap =
          indexTLV(
            element.children,
            path
          );

        childMap.forEach(
          (value, key) => {
            map.set(
              key,
              value
            );
          }
        );
      }
    }
  );

  return map;
}

function flattenTopLevel(
  elements: TLV[]
): Map<string, TLV> {
  const map =
    new Map<string, TLV>();

  for (const element of elements) {
    map.set(
      element.tag,
      element
    );
  }

  return map;
}

function compareValues(
  staticValue:
    | string
    | null
    | undefined,

  dynamicValue:
    | string
    | null
    | undefined
) {
  if (
    staticValue === dynamicValue
  ) {
    return "same";
  }

  if (
    staticValue == null &&
    dynamicValue != null
  ) {
    return "added";
  }

  if (
    staticValue != null &&
    dynamicValue == null
  ) {
    return "removed";
  }

  return "changed";
}

function compareNested(
  staticChildren: TLV[] = [],
  dynamicChildren: TLV[] = [],
  prefix = ""
): TLVDiff[] {
  const staticMap =
    new Map(
      staticChildren.map(
        (item) => [
          item.tag,
          item,
        ]
      )
    );

  const dynamicMap =
    new Map(
      dynamicChildren.map(
        (item) => [
          item.tag,
          item,
        ]
      )
    );

  const tags =
    new Set([
      ...staticMap.keys(),
      ...dynamicMap.keys(),
    ]);

  const result: TLVDiff[] = [];

  for (const tag of tags) {
    const staticItem =
      staticMap.get(tag);

    const dynamicItem =
      dynamicMap.get(tag);

    const path = prefix
      ? `${prefix}.${tag}`
      : tag;

    if (
      staticItem &&
      dynamicItem
    ) {
      result.push({
        path,
        tag,
        name:
          dynamicItem.name ||
          staticItem.name,

        status:
          staticItem.value ===
          dynamicItem.value
            ? "same"
            : "changed",

        staticValue:
          staticItem.value,

        dynamicValue:
          dynamicItem.value,

        staticLength:
          staticItem.length,

        dynamicLength:
          dynamicItem.length,

        staticChildren:
          staticItem.children,

        dynamicChildren:
          dynamicItem.children,
      });

      if (
        staticItem.children ||
        dynamicItem.children
      ) {
        result.push(
          ...compareNested(
            staticItem.children ??
              [],
            dynamicItem.children ??
              [],
            path
          )
        );
      }

      continue;
    }

    if (dynamicItem) {
      result.push({
        path,
        tag,
        name: dynamicItem.name,

        status: "added",

        dynamicValue:
          dynamicItem.value,

        dynamicLength:
          dynamicItem.length,

        dynamicChildren:
          dynamicItem.children,
      });

      continue;
    }

    if (staticItem) {
      result.push({
        path,
        tag,
        name: staticItem.name,

        status: "removed",

        staticValue:
          staticItem.value,

        staticLength:
          staticItem.length,

        staticChildren:
          staticItem.children,
      });
    }
  }

  return result;
}

function findCharacterDifferences(
  staticValue:
    | string
    | null
    | undefined,

  dynamicValue:
    | string
    | null
    | undefined
): CharacterDifference[] {
  if (
    staticValue == null ||
    dynamicValue == null ||
    staticValue === dynamicValue
  ) {
    return [];
  }

  const maxLength =
    Math.max(
      staticValue.length,
      dynamicValue.length
    );

  const differences:
    CharacterDifference[] =
    [];

  for (
    let i = 0;
    i < maxLength;
    i++
  ) {
    const staticChar =
      staticValue[i] ??
      null;

    const dynamicChar =
      dynamicValue[i] ??
      null;

    if (
      staticChar !==
      dynamicChar
    ) {
      differences.push({
        position: i,
        staticChar,
        dynamicChar,
      });
    }
  }

  return differences;
}

export function analyzeQRIS(
  staticQRIS: string,
  dynamicQRIS: string
) {
  /**
   * Hanya trim bagian luar.
   * Jangan menghapus whitespace internal.
   */
  const staticClean =
    staticQRIS.trim();

  const dynamicClean =
    dynamicQRIS.trim();

  if (!staticClean) {
    throw new Error(
      "QRIS static kosong."
    );
  }

  if (!dynamicClean) {
    throw new Error(
      "QRIS dynamic kosong."
    );
  }

  const staticParsed =
    parseQRIS(staticClean);

  const dynamicParsed =
    parseQRIS(dynamicClean);

  const staticCRC =
    verifyCRC16(
      staticClean
    );

  const dynamicCRC =
    verifyCRC16(
      dynamicClean
    );

  const staticTags =
    flattenTopLevel(
      parseTLV(staticClean)
    );

  const dynamicTags =
    flattenTopLevel(
      parseTLV(dynamicClean)
    );

  const allTags =
    new Set([
      ...staticTags.keys(),
      ...dynamicTags.keys(),
    ]);

  const differences:
    TLVDiff[] = [];

  for (const tag of allTags) {
    const staticElement =
      staticTags.get(tag);

    const dynamicElement =
      dynamicTags.get(tag);

    if (
      staticElement &&
      dynamicElement
    ) {
      differences.push({
        path: tag,
        tag,

        name:
          dynamicElement.name ||
          staticElement.name,

        status:
          staticElement.value ===
          dynamicElement.value
            ? "same"
            : "changed",

        staticValue:
          staticElement.value,

        dynamicValue:
          dynamicElement.value,

        staticLength:
          staticElement.length,

        dynamicLength:
          dynamicElement.length,

        staticChildren:
          staticElement.children,

        dynamicChildren:
          dynamicElement.children,
      });

      continue;
    }

    if (dynamicElement) {
      differences.push({
        path: tag,
        tag,
        name:
          dynamicElement.name,

        status: "added",

        dynamicValue:
          dynamicElement.value,

        dynamicLength:
          dynamicElement.length,

        dynamicChildren:
          dynamicElement.children,
      });

      continue;
    }

    if (staticElement) {
      differences.push({
        path: tag,
        tag,
        name:
          staticElement.name,

        status: "removed",

        staticValue:
          staticElement.value,

        staticLength:
          staticElement.length,

        staticChildren:
          staticElement.children,
      });
    }
  }

  const staticTag26 =
    staticTags.get("26");

  const dynamicTag26 =
    dynamicTags.get("26");

  const staticTag62 =
    staticTags.get("62");

  const dynamicTag62 =
    dynamicTags.get("62");

  const staticTag26Child01 =
    staticTag26?.children?.find(
      (item) =>
        item.tag === "01"
    )?.value ?? null;

  const dynamicTag26Child01 =
    dynamicTag26?.children?.find(
      (item) =>
        item.tag === "01"
    )?.value ?? null;

  const characterDifferences =
    findCharacterDifferences(
      staticTag26Child01,
      dynamicTag26Child01
    );

  const pointOfInitiationChanged =
    staticParsed.method !==
    dynamicParsed.method;

  const amountAdded =
    staticParsed.amount ==
      null &&
    dynamicParsed.amount !=
      null;

  const tag26Changed =
    staticTag26Child01 !==
    dynamicTag26Child01;

  const tag62Changed =
    staticTag62?.value !==
    dynamicTag62?.value;

  const tag62Added =
    !staticTag62 &&
    !!dynamicTag62;

  const providerSpecific =
    tag26Changed ||
    tag62Changed ||
    tag62Added;

  let conclusion =
    "Belum cukup data untuk menentukan pola.";

  if (
    pointOfInitiationChanged &&
    amountAdded &&
    !providerSpecific
  ) {
    conclusion =
      "Perubahan yang terlihat terutama berupa perubahan Point of Initiation dan penambahan nominal.";
  }

  if (providerSpecific) {
    conclusion =
      "Ditemukan perubahan provider-specific pada QRIS dynamic. Tag 26 dan/atau Tag 62 berubah sehingga converter sederhana 01 + 54 tidak boleh langsung dianggap setara dengan QRIS dynamic asli provider.";
  }

  if (
    !staticCRC.valid ||
    !dynamicCRC.valid
  ) {
    conclusion +=
      " Namun validasi CRC salah pada salah satu input, sehingga input perlu diperiksa kembali tanpa mengubah karakter/spasi internal.";
  }

  return {
    static: {
      parsed: staticParsed,
      crc: staticCRC,
    },

    dynamic: {
      parsed: dynamicParsed,
      crc: dynamicCRC,
    },

    comparison: {
      lengthDifference:
        dynamicClean.length -
        staticClean.length,

      pointOfInitiationChanged,

      staticMethod:
        staticParsed.method,

      dynamicMethod:
        dynamicParsed.method,

      staticAmount:
        staticParsed.amount ??
        null,

      dynamicAmount:
        dynamicParsed.amount ??
        null,

      amountAdded,

      crcStaticValid:
        staticCRC.valid,

      crcDynamicValid:
        dynamicCRC.valid,

      providerSpecific,

      providerSpecificChanges: {
        tag26Changed,
        tag62Added,
        tag62Changed,
      },

      tag26: {
        static01:
          staticTag26Child01,

        dynamic01:
          dynamicTag26Child01,

        characterDifferences,
      },

      tag62: {
        static:
          staticTag62?.value ??
          null,

        dynamic:
          dynamicTag62?.value ??
          null,

        staticNested:
          staticTag62?.children ??
          [],

        dynamicNested:
          dynamicTag62?.children ??
          [],
      },

      differences,

      conclusion,
    },

    meta: {
      analyzerVersion: "V4",
      parser:
        "TLV-preserving",
      crcAlgorithm:
        "CRC-16/CCITT-FALSE",
      whitespacePolicy:
        "trim only outer whitespace; preserve internal whitespace",
    },
  };
}