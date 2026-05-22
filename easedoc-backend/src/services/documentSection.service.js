import {
  saveSectionWithBlocks,
  getSectionsByDocument,
} from "../models/documentSection.model.js";
import { getDocumentService } from "./document.service.js";

const BLOCK_TYPES = new Set(["paragraph", "image", "table"]);

const hasText = (value) =>
  value !== null && value !== undefined && `${value}`.trim() !== "";

const stringifyPayload = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return typeof value === "string" ? value : JSON.stringify(value);
};

const normalizeBlock = (block = {}) => {
  const type = BLOCK_TYPES.has(block.type || block.block_type)
    ? block.type || block.block_type
    : "paragraph";

  if (type === "image") {
    return {
      type,
      text: "",
      image: {
        src: block.image?.src || block.image_src || "",
        alt: block.image?.alt || block.image_alt || "",
        caption: block.image?.caption || block.image_caption || "",
      },
      tableData: null,
      metadata: stringifyPayload(block.metadata),
    };
  }

  if (type === "table") {
    return {
      type,
      text: "",
      image: { src: "", alt: "", caption: "" },
      tableData: stringifyPayload(block.tableData || block.table_data),
      metadata: stringifyPayload(block.metadata),
    };
  }

  return {
    type: "paragraph",
    text: block.text ?? block.text_content ?? block.content ?? "",
    image: { src: "", alt: "", caption: "" },
    tableData: null,
    metadata: stringifyPayload(block.metadata),
  };
};

const normalizeBlocks = (blocks, legacyContent = "") => {
  if (Array.isArray(blocks) && blocks.length > 0) {
    return blocks.map(normalizeBlock);
  }

  return [
    normalizeBlock({
      type: "paragraph",
      text: legacyContent || "",
    }),
  ];
};

const blocksToLegacyContent = (blocks) =>
  blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text || "")
    .join("\n");

const shapeBlock = (row) => ({
  id: row.block_id,
  type: row.block_type,
  order: row.block_order,
  text: row.text_content || "",
  image: {
    src: row.image_src || "",
    alt: row.image_alt || "",
    caption: row.image_caption || "",
  },
  tableData: row.table_data || null,
  metadata: row.block_metadata || null,
});

const shapeSections = (rows) => {
  const sectionsById = new Map();

  rows.forEach((row) => {
    if (!sectionsById.has(row.id)) {
      sectionsById.set(row.id, {
        id: row.id,
        document_id: row.document_id,
        template_section_version_id: row.template_section_version_id,
        content: row.content || "",
        custom_title: row.custom_title,
        last_updated: row.last_updated,
        title: row.title,
        section_order: row.section_order,
        blocks: [],
      });
    }

    if (row.block_id) {
      sectionsById.get(row.id).blocks.push(shapeBlock(row));
    }
  });

  return Array.from(sectionsById.values()).map((section) => {
    const blocks = section.blocks.length
      ? section.blocks
      : normalizeBlocks([], section.content);

    return {
      ...section,
      blocks,
      content: blocksToLegacyContent(blocks),
    };
  });
};

export const getSectionsService = (documentId) => {
  return getDocumentService(documentId).then(() => new Promise((resolve, reject) => {
    getSectionsByDocument(documentId, (err, results) => {
      if (err) return reject(err);
      resolve(shapeSections(results));
    });
  }));
};

export const saveSectionService = async (data) => {
  const blocks = normalizeBlocks(data.blocks, data.content);
  const legacyContent = blocksToLegacyContent(blocks);

  await saveSectionWithBlocks({
    document_id: data.document_id,
    template_section_version_id: data.template_section_version_id,
    content: legacyContent,
    custom_title: hasText(data.custom_title) ? data.custom_title : null,
  }, blocks);

  return { message: "Section saved" };
};
