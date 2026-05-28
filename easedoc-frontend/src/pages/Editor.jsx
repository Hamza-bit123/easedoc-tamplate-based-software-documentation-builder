import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useBlocker } from "react-router-dom";
import api from "../api/axios";
import "./Editor.css";
import EasDocLoader from "../components/EasDocLoader";
import generatePrintHTML from "../utils/generatePrintHTML";
import {
  buildSectionNumbers,
  computeFigureLabels,
  computeTableLabels,
  getDefaultFigureCaption,
  getDefaultTableCaption,
  parseSeedBlocks,
} from "../utils/figureNumbering";
import {
  FiArrowDown,
  FiArrowUp,
  FiChevronUp,
  FiDownload,
  FiEye,
  FiFileText,
  FiGrid,
  FiImage,
  FiMinus,
  FiPlus,
  FiSave,
  FiTrash2,
  FiType,
  FiUpload,
  FiX,
  FiSettings,
  FiCheckCircle
} from "react-icons/fi";
import { BiSolidFileDoc } from "react-icons/bi";
import toast from "react-hot-toast";

const newBlockId = () =>
  `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const DEFAULT_TABLE_ROWS = 3;
const DEFAULT_TABLE_COLUMNS = 3;
const MIN_TABLE_ROWS = 1;
const MIN_TABLE_COLUMNS = 1;
const MAX_TABLE_ROWS = 24;
const MAX_TABLE_COLUMNS = 8;

const parseJsonPayload = (value) => {
  if (!value || typeof value !== "string") return value || null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getTableColumnCount = (rows = []) =>
  rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);

const createTableData = ({
  caption = "",
  columns = DEFAULT_TABLE_COLUMNS,
  headers,
  rowCount,
  rows,
} = {}) => {
  const headerLabels = Array.isArray(headers)
    ? headers
    : Array.isArray(columns)
      ? columns
      : [];
  const requestedColumns = Array.isArray(columns)
    ? columns.length
    : Number(columns);
  const columnCount = clamp(
    Number.isFinite(requestedColumns) && requestedColumns > 0
      ? requestedColumns
      : headerLabels.length || DEFAULT_TABLE_COLUMNS,
    MIN_TABLE_COLUMNS,
    MAX_TABLE_COLUMNS,
  );
  const requestedRows = Number(rowCount ?? rows);
  const totalRows = clamp(
    Number.isFinite(requestedRows) && requestedRows > 0
      ? requestedRows
      : DEFAULT_TABLE_ROWS,
    MIN_TABLE_ROWS,
    MAX_TABLE_ROWS,
  );

  return {
    caption,
    hasHeader: true,
    rows: Array.from({ length: totalRows }, (_, rowIndex) =>
      Array.from({ length: columnCount }, (_, columnIndex) =>
        rowIndex === 0 ? headerLabels[columnIndex] || `Column ${columnIndex + 1}` : "",
      ),
    ),
  };
};

const normalizeTableData = (value, fallback = {}) => {
  const parsed = parseJsonPayload(value) || {};
  const source = Array.isArray(parsed) ? { rows: parsed } : parsed;
  const sourceRows = Array.isArray(source.rows)
    ? source.rows
    : Array.isArray(source.cells)
      ? source.cells
      : [];
  const headerLabels = Array.isArray(source.headers)
    ? source.headers
    : Array.isArray(source.columns)
      ? source.columns
      : Array.isArray(fallback.headers)
        ? fallback.headers
        : Array.isArray(fallback.columns)
          ? fallback.columns
          : [];
  const requestedColumns = Number(source.columnCount ?? fallback.columnCount);
  const columnCount = clamp(
    Math.max(
      getTableColumnCount(sourceRows),
      headerLabels.length,
      Number.isFinite(requestedColumns) ? requestedColumns : 0,
      MIN_TABLE_COLUMNS,
    ),
    MIN_TABLE_COLUMNS,
    MAX_TABLE_COLUMNS,
  );
  const requestedRows = Number(source.rowCount ?? fallback.rowCount);
  const rowCount = clamp(
    sourceRows.length ||
      (Number.isFinite(requestedRows) && requestedRows > 0
        ? requestedRows
        : DEFAULT_TABLE_ROWS),
    MIN_TABLE_ROWS,
    MAX_TABLE_ROWS,
  );

  return {
    caption: `${source.caption ?? fallback.caption ?? ""}`,
    hasHeader: source.hasHeader !== false,
    rows: Array.from({ length: rowCount }, (_, rowIndex) => {
      const row = Array.isArray(sourceRows[rowIndex]) ? sourceRows[rowIndex] : [];

      return Array.from({ length: columnCount }, (_, columnIndex) => {
        const cell = row[columnIndex];
        if (cell !== undefined && cell !== null) return `${cell}`;
        if (rowIndex === 0 && headerLabels[columnIndex]) return `${headerLabels[columnIndex]}`;
        if (rowIndex === 0 && sourceRows.length === 0) return `Column ${columnIndex + 1}`;
        return "";
      });
    }),
  };
};

const createParagraphBlock = (text = "") => ({
  clientId: newBlockId(),
  type: "paragraph",
  text,
  image: { src: "", alt: "", caption: "" },
  tableData: null,
});

const createImageBlock = (caption = "") => ({
  clientId: newBlockId(),
  type: "image",
  text: "",
  image: { src: "", alt: "", caption },
  tableData: null,
  metadata: { captionAuto: Boolean(caption), captionUserEdited: false },
});

const createTableBlock = (sectionTitle = "", options = {}) => ({
  clientId: newBlockId(),
  type: "table",
  text: "",
  image: { src: "", alt: "", caption: "" },
  tableData: createTableData({
    caption: options.caption || getDefaultTableCaption(sectionTitle),
    columns: options.columns || options.headers || DEFAULT_TABLE_COLUMNS,
    headers: options.headers,
    rowCount: options.rowCount,
    rows: options.rows,
  }),
  metadata: {
    optional: Boolean(options.optional),
    captionAuto: true,
    captionUserEdited: false,
  },
});

const createBlockByType = (type, sectionTitle = "") => {
  if (type === "image") {
    return createImageBlock(getDefaultFigureCaption(sectionTitle));
  }

  if (type === "table") {
    return createTableBlock(sectionTitle);
  }

  return createParagraphBlock();
};

const normalizeBlock = (block = {}) => {
  if ((block.type || block.block_type) === "image") {
    return {
      clientId: block.id || newBlockId(),
      id: block.id,
      type: "image",
      text: "",
      image: {
        src: block.image?.src || block.image_src || "",
        alt: block.image?.alt || block.image_alt || "",
        caption: block.image?.caption || block.image_caption || "",
      },
      tableData: null,
      metadata: parseJsonPayload(block.metadata) || block.metadata || null,
    };
  }

  if ((block.type || block.block_type) === "table") {
    return {
      clientId: block.id || newBlockId(),
      id: block.id,
      type: "table",
      text: "",
      image: { src: "", alt: "", caption: "" },
      tableData: normalizeTableData(block.tableData || block.table_data),
      metadata: parseJsonPayload(block.metadata) || block.metadata || null,
    };
  }

  return {
    clientId: block.id || newBlockId(),
    id: block.id,
    type: "paragraph",
    text: block.text ?? block.text_content ?? block.content ?? "",
    image: { src: "", alt: "", caption: "" },
    tableData: null,
    metadata: parseJsonPayload(block.metadata) || block.metadata || null,
  };
};

const blocksFromSeed = (seedBlocks, sectionTitle = "") => {
  const seeds = parseSeedBlocks(seedBlocks);
  if (!seeds) return null;

  return seeds.map((seed) => {
    if (seed.type === "image") {
      const caption = seed.caption || getDefaultFigureCaption(sectionTitle);
      return {
        ...createImageBlock(caption),
        metadata: {
          optional: Boolean(seed.optional),
          captionAuto: true,
          captionUserEdited: false,
        },
      };
    }

    if (seed.type === "table") {
      return createTableBlock(sectionTitle, {
        ...seed,
        caption: seed.caption || getDefaultTableCaption(sectionTitle),
      });
    }

    return createParagraphBlock();
  });
};

const resolveInitialSectionBlocks = (templateSection, saved = {}) => {
  if (Array.isArray(saved.blocks) && saved.blocks.length > 0) {
    return normalizeSectionBlocks(saved);
  }

  if (`${saved.content || ""}`.trim()) {
    return normalizeSectionBlocks(saved);
  }

  const seeded = blocksFromSeed(templateSection.seed_blocks, templateSection.title);
  if (seeded) return seeded;

  return [createParagraphBlock()];
};

const normalizeSectionBlocks = (section = {}) => {
  if (Array.isArray(section.blocks) && section.blocks.length > 0) {
    return section.blocks.map(normalizeBlock);
  }

  return [createParagraphBlock(section.content || "")];
};

const serializeBlock = (block) => {
  if (block.type === "image") {
    return {
      type: "image",
      image: {
        src: block.image?.src || "",
        alt: block.image?.alt || "",
        caption: block.image?.caption || "",
      },
      metadata: block.metadata || null,
    };
  }

  if (block.type === "table") {
    return {
      type: "table",
      tableData: normalizeTableData(block.tableData),
      metadata: block.metadata || null,
    };
  }

  return {
    type: "paragraph",
    text: block.text || "",
    metadata: block.metadata || null,
  };
};

const blocksToLegacyContent = (blocks) =>
  blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text || "")
    .join("\n");

const compressImageToDataUrl = (file, maxWidth = 1400) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(reader.result || "");
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(outputType, 0.86));
      };
      image.onerror = () => reject(new Error("Invalid image file"));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });

const getCaretTop = (textarea) => {
  if (!textarea) return 4;

  const style = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(style.lineHeight) || 22;
  const paddingTop = parseFloat(style.paddingTop) || 3;
  const textBefore = textarea.value.substring(0, textarea.selectionStart ?? 0);
  const lineCount = Math.max(1, textBefore.split("\n").length);

  // Subtract half the insert button height (13px) to center button on the cursor line
  return paddingTop + (lineCount - 1) * lineHeight - 13;
};

const Editor = () => {
  const { documentId } = useParams();

  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState({});
  const [errors, setErrors] = useState({});
  const [previewHTML, setPreviewHTML] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("draft");
  const [documentTitle, setDocumentTitle] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [openAddMenu, setOpenAddMenu] = useState(null);
  const [insertionTarget, setInsertionTarget] = useState(null);
  const [focusedParagraph, setFocusedParagraph] = useState(null);
  const textareaRefs = useRef({});
  const imageUrlRefs = useRef({});
  const imageFileInputRefs = useRef({});
  const tableCellRefs = useRef({});
  const pendingFocusRef = useRef(null);
  const paragraphBlurTimeoutRef = useRef(null);
  const toolsMenuTimerRef = useRef(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const PAGE_HEIGHT = 1122;

  useEffect(() => {
    if (showToolsMenu) {
      if (toolsMenuTimerRef.current) clearTimeout(toolsMenuTimerRef.current);
      toolsMenuTimerRef.current = setTimeout(() => {
        setShowToolsMenu(false);
      }, 30000);
    }
    return () => {
      if (toolsMenuTimerRef.current) clearTimeout(toolsMenuTimerRef.current);
    };
  }, [showToolsMenu]);

  const resetToolsTimer = () => {
    if (!showToolsMenu) return;
    if (toolsMenuTimerRef.current) clearTimeout(toolsMenuTimerRef.current);
    toolsMenuTimerRef.current = setTimeout(() => setShowToolsMenu(false), 30000);
  };

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const getBlocksForSection = useCallback(
    (sectionId) =>
      sections[sectionId]?.blocks?.length
        ? sections[sectionId].blocks
        : [createParagraphBlock()],
    [sections],
  );

  useEffect(() => {
    setTimeout(() => {
      document.querySelectorAll(".editor-block-textarea").forEach((textarea) => {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      });
    }, 0);
  }, [sections]);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;

    const node =
      pending.type === "image"
        ? imageUrlRefs.current[pending.clientId]
        : pending.type === "table"
          ? tableCellRefs.current[pending.clientId]
          : textareaRefs.current[pending.clientId];

    if (!node) return;

    node.focus();

    if (pending.type === "table" && typeof node.select === "function") {
      node.select();
    }

    if (pending.type === "paragraph" && typeof node.setSelectionRange === "function") {
      const offset = clamp(pending.offset || 0, 0, node.value.length);
      node.setSelectionRange(offset, offset);

      const blockIndex =
        sections[pending.sectionId]?.blocks?.findIndex(
          (block) => (block.clientId || block.id) === pending.clientId,
        ) ?? -1;

      if (blockIndex >= 0) {
        setInsertionTarget({
          sectionId: pending.sectionId,
          blockIndex,
          blockClientId: pending.clientId,
          selectionStart: offset,
          selectionEnd: offset,
        });
      }
    }

    pendingFocusRef.current = null;
  }, [sections]);

  useEffect(() => {
    const scroller = document.querySelector(".main-container");
    if (!scroller) return;

    const onScroll = () => {
      setShowScrollTop(scroller.scrollTop > 400);
    };

    scroller.addEventListener("scroll", onScroll);
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    document
      .querySelector(".main-container")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadEditor = useCallback(async () => {
    try {
      const doc = await api.get(`/documents/${documentId}`);

      if (!doc.data.template_version_id) {
        throw new Error("Document has no template version");
      }

      const endpoint = `/templates/${doc.data.template_id}/version/${doc.data.template_version_id}/full`;
      const temp = await api.get(endpoint);
      const sec = await api.get(`/document-sections/${documentId}`);
      const savedSections = new Map(
        sec.data.map((item) => [item.template_section_version_id, item]),
      );

      const map = {};
      temp.data.sections.forEach((templateSection) => {
        const saved = savedSections.get(templateSection.id) || {};
        map[templateSection.id] = {
          title: saved.custom_title || "",
          blocks: resolveInitialSectionBlocks(templateSection, saved),
        };
      });

      setTemplate(temp.data);
      setSections(map);
      setStatus(doc.data.status || "draft");
      setDocumentTitle(doc.data.title || "");
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load editor";
      setLoadError(message);
      toast.error("Failed to load editor");
    }
  }, [documentId]);

  useEffect(() => {
    loadEditor();
  }, [loadEditor]);

  const handleTitleChange = (id, value) => {
    setIsDirty(true);
    setSections((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        title: value,
      },
    }));
  };

  const updateBlocks = (sectionId, updater) => {
    setIsDirty(true);
    setSections((prev) => {
      const current = prev[sectionId] || {
        title: "",
        blocks: [createParagraphBlock()],
      };
      const currentBlocks = current.blocks?.length
        ? current.blocks
        : [createParagraphBlock()];

      return {
        ...prev,
        [sectionId]: {
          ...current,
          blocks: updater(currentBlocks),
        },
      };
    });
  };

  const handleParagraphChange = (sectionId, blockIndex, value) => {
    updateBlocks(sectionId, (blocks) =>
      blocks.map((block, index) =>
        index === blockIndex ? { ...block, text: value } : block,
      ),
    );
  };

  const getSectionTitle = (sectionId) => {
    const templateSection = template?.sections?.find((sec) => sec.id === sectionId);
    return sections[sectionId]?.title || templateSection?.title || "";
  };

  const handleImageChange = (sectionId, blockIndex, field, value) => {
    updateBlocks(sectionId, (blocks) =>
      blocks.map((block, index) => {
        if (index !== blockIndex) return block;

        const nextImage = {
          ...block.image,
          [field]: value,
        };
        let metadata = { ...(block.metadata || {}) };

        if (field === "caption") {
          metadata = {
            ...metadata,
            captionUserEdited: true,
            captionAuto: false,
          };
        }

        if (
          field === "src" &&
          value &&
          !metadata.captionUserEdited &&
          !`${nextImage.caption || ""}`.trim()
        ) {
          nextImage.caption = getDefaultFigureCaption(getSectionTitle(sectionId));
          metadata = { ...metadata, captionAuto: true };
        }

        return {
          ...block,
          image: nextImage,
          metadata,
        };
      }),
    );
  };

  const updateTableData = (sectionId, blockIndex, updater) => {
    updateBlocks(sectionId, (blocks) =>
      blocks.map((block, index) => {
        if (index !== blockIndex || block.type !== "table") return block;

        return {
          ...block,
          tableData: normalizeTableData(updater(normalizeTableData(block.tableData))),
        };
      }),
    );
  };

  const handleTableCaptionChange = (sectionId, blockIndex, value) => {
    updateBlocks(sectionId, (blocks) =>
      blocks.map((block, index) => {
        if (index !== blockIndex || block.type !== "table") return block;

        return {
          ...block,
          tableData: {
            ...normalizeTableData(block.tableData),
            caption: value,
          },
          metadata: {
            ...(block.metadata || {}),
            captionAuto: false,
            captionUserEdited: true,
          },
        };
      }),
    );
  };

  const handleTableCellChange = (
    sectionId,
    blockIndex,
    rowIndex,
    columnIndex,
    value,
  ) => {
    updateTableData(sectionId, blockIndex, (table) => {
      const rows = table.rows.map((row) => [...row]);
      rows[rowIndex][columnIndex] = value;

      return { ...table, rows };
    });
  };

  const addTableRow = (sectionId, blockIndex) => {
    updateTableData(sectionId, blockIndex, (table) => {
      if (table.rows.length >= MAX_TABLE_ROWS) return table;
      const columnCount = getTableColumnCount(table.rows) || DEFAULT_TABLE_COLUMNS;

      return {
        ...table,
        rows: [...table.rows, Array.from({ length: columnCount }, () => "")],
      };
    });
  };

  const removeTableRow = (sectionId, blockIndex) => {
    updateTableData(sectionId, blockIndex, (table) => {
      if (table.rows.length <= MIN_TABLE_ROWS) return table;
      return { ...table, rows: table.rows.slice(0, -1) };
    });
  };

  const addTableColumn = (sectionId, blockIndex) => {
    updateTableData(sectionId, blockIndex, (table) => {
      const columnCount = getTableColumnCount(table.rows);
      if (columnCount >= MAX_TABLE_COLUMNS) return table;

      return {
        ...table,
        rows: table.rows.map((row, rowIndex) => [
          ...row,
          table.hasHeader && rowIndex === 0 ? `Column ${columnCount + 1}` : "",
        ]),
      };
    });
  };

  const removeTableColumn = (sectionId, blockIndex) => {
    updateTableData(sectionId, blockIndex, (table) => {
      const columnCount = getTableColumnCount(table.rows);
      if (columnCount <= MIN_TABLE_COLUMNS) return table;

      return {
        ...table,
        rows: table.rows.map((row) => row.slice(0, -1)),
      };
    });
  };

  const toggleTableHeader = (sectionId, blockIndex) => {
    updateTableData(sectionId, blockIndex, (table) => ({
      ...table,
      hasHeader: !table.hasHeader,
    }));
  };

  const trackParagraphCaret = (sectionId, blockIndex, block, textarea) => {
    const blockClientId = block.clientId || block.id;
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;

    setInsertionTarget({
      sectionId,
      blockIndex,
      blockClientId,
      selectionStart,
      selectionEnd,
    });

    setFocusedParagraph({
      sectionId,
      blockClientId,
      caretTop: getCaretTop(textarea),
    });
  };

  const clearParagraphFocusSoon = () => {
    if (paragraphBlurTimeoutRef.current) {
      clearTimeout(paragraphBlurTimeoutRef.current);
    }

    paragraphBlurTimeoutRef.current = setTimeout(() => {
      setFocusedParagraph(null);
      setOpenAddMenu((current) =>
        current?.startsWith("cursor:") ? null : current,
      );
    }, 180);
  };

  const cancelParagraphBlur = () => {
    if (paragraphBlurTimeoutRef.current) {
      clearTimeout(paragraphBlurTimeoutRef.current);
      paragraphBlurTimeoutRef.current = null;
    }
  };

  const triggerImageFilePicker = (blockKey) => {
    imageFileInputRefs.current[blockKey]?.click();
  };

  const insertBlockAfter = (sectionId, afterIndex, type) => {
    const block = createBlockByType(type, getSectionTitle(sectionId));

    updateBlocks(sectionId, (blocks) => {
      const next = [...blocks];
      next.splice(afterIndex + 1, 0, block);
      return next;
    });

    pendingFocusRef.current = {
      type: block.type,
      clientId: block.clientId,
      sectionId,
      offset: 0,
    };
    setOpenAddMenu(null);
  };

  const insertBlockAtCursor = (type, target = insertionTarget) => {
    if (!target) return;

    const insertedBlock = createBlockByType(type, getSectionTitle(target.sectionId));

    updateBlocks(target.sectionId, (blocks) => {
      const targetIndex = blocks.findIndex((block, index) => {
        const blockClientId = block.clientId || block.id;
        return target.blockClientId
          ? blockClientId === target.blockClientId
          : index === target.blockIndex;
      });

      if (targetIndex < 0) {
        return blocks;
      }

      const sourceBlock = blocks[targetIndex];

      if (sourceBlock.type !== "paragraph") {
        const next = [...blocks];
        next.splice(targetIndex + 1, 0, insertedBlock);
        return next;
      }

      const sourceText = sourceBlock.text || "";
      const start = clamp(target.selectionStart ?? sourceText.length, 0, sourceText.length);
      const end = clamp(target.selectionEnd ?? start, start, sourceText.length);
      const before = sourceText.slice(0, start);
      const after = sourceText.slice(end);
      const hasBefore = before.length > 0 || start > 0;
      const hasAfter = after.length > 0 || end < sourceText.length;
      const replacement = [];

      if (hasBefore) {
        replacement.push({ ...sourceBlock, text: before });
      }

      replacement.push(insertedBlock);

      if (hasAfter) {
        replacement.push(
          hasBefore
            ? createParagraphBlock(after)
            : { ...sourceBlock, text: after },
        );
      } else if (!hasBefore && type !== "paragraph") {
        replacement.push(createParagraphBlock());
      }

      const next = [...blocks];
      next.splice(targetIndex, 1, ...replacement);
      return next;
    });

    pendingFocusRef.current = {
      type: insertedBlock.type,
      clientId: insertedBlock.clientId,
      sectionId: target.sectionId,
      offset: 0,
    };
    setOpenAddMenu(null);
  };

  const openCursorAddMenu = (sectionId, blockIndex, block) => {
    cancelParagraphBlur();
    const blockClientId = block.clientId || block.id;
    const isCurrentTarget =
      insertionTarget?.sectionId === sectionId &&
      insertionTarget?.blockClientId === blockClientId;
    const fallbackOffset = (block.text || "").length;

    setInsertionTarget(
      isCurrentTarget
        ? insertionTarget
        : {
            sectionId,
            blockIndex,
            blockClientId,
            selectionStart: fallbackOffset,
            selectionEnd: fallbackOffset,
          },
    );
    setOpenAddMenu(`cursor:${sectionId}:${blockClientId}`);
  };

  const splitParagraphAtCursor = (sectionId, blockIndex, block, textarea) => {
    const blockClientId = block.clientId || block.id;
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const newBlock = createParagraphBlock();

    updateBlocks(sectionId, (blocks) => {
      const targetIndex = blocks.findIndex(
        (item, index) =>
          (item.clientId || item.id) === blockClientId || index === blockIndex,
      );

      if (targetIndex < 0) return blocks;

      const sourceBlock = blocks[targetIndex];
      if (sourceBlock.type !== "paragraph") return blocks;

      const sourceText = sourceBlock.text || "";
      const start = clamp(selectionStart, 0, sourceText.length);
      const end = clamp(selectionEnd, start, sourceText.length);
      const before = sourceText.slice(0, start);
      const after = sourceText.slice(end);
      const next = [...blocks];

      next.splice(
        targetIndex,
        1,
        { ...sourceBlock, text: before },
        { ...newBlock, text: after },
      );

      return next;
    });

    pendingFocusRef.current = {
      type: "paragraph",
      clientId: newBlock.clientId,
      sectionId,
      offset: 0,
    };
  };

  const mergeParagraphBackward = (sectionId, blockIndex, block) => {
    const blockClientId = block.clientId || block.id;

    updateBlocks(sectionId, (blocks) => {
      const targetIndex = blocks.findIndex(
        (item, index) =>
          (item.clientId || item.id) === blockClientId || index === blockIndex,
      );

      if (targetIndex <= 0) return blocks;

      const currentBlock = blocks[targetIndex];
      const previousBlock = blocks[targetIndex - 1];

      if (currentBlock.type !== "paragraph" || previousBlock.type !== "paragraph") {
        return blocks;
      }

      const previousText = previousBlock.text || "";
      const next = [...blocks];
      next.splice(targetIndex - 1, 2, {
        ...previousBlock,
        text: `${previousText}${currentBlock.text || ""}`,
      });

      pendingFocusRef.current = {
        type: "paragraph",
        clientId: previousBlock.clientId || previousBlock.id,
        sectionId,
        offset: previousText.length,
      };

      return next;
    });
  };

  const handleParagraphKeyDown = (event, sectionId, blockIndex, block) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      splitParagraphAtCursor(sectionId, blockIndex, block, event.currentTarget);
      return;
    }

    if (
      event.key === "Backspace" &&
      event.currentTarget.selectionStart === 0 &&
      event.currentTarget.selectionEnd === 0
    ) {
      event.preventDefault();
      mergeParagraphBackward(sectionId, blockIndex, block);
    }
  };

  const deleteBlock = (sectionId, blockIndex) => {
    updateBlocks(sectionId, (blocks) => {
      if (blocks.length === 1) {
        return [createParagraphBlock()];
      }

      return blocks.filter((_, index) => index !== blockIndex);
    });
  };

  const moveBlock = (sectionId, blockIndex, direction) => {
    updateBlocks(sectionId, (blocks) => {
      const nextIndex = blockIndex + direction;
      if (nextIndex < 0 || nextIndex >= blocks.length) return blocks;

      const next = [...blocks];
      [next[blockIndex], next[nextIndex]] = [next[nextIndex], next[blockIndex]];
      return next;
    });
  };

  const handleImageFile = async (sectionId, blockIndex, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }

    try {
      const dataUrl = await compressImageToDataUrl(file);
      handleImageChange(sectionId, blockIndex, "src", dataUrl);
    } catch {
      toast.error("Could not process image.");
    }
  };

  const saveAll = useCallback(async () => {
    if (!template) return;

    try {
      setSaving(true);

      const cleanDocumentTitle = documentTitle.trim();
      if (!cleanDocumentTitle) {
        toast.error("Document name is required.");
        setSaving(false);
        return;
      }

      await api.put(`/documents/${documentId}/title`, {
        title: cleanDocumentTitle,
      });
      setDocumentTitle(cleanDocumentTitle);

      for (let sec of template.sections) {
        const blocks = getBlocksForSection(sec.id).map(serializeBlock);

        await api.post("/document-sections/save", {
          document_id: documentId,
          template_section_version_id: sec.id,
          content: blocksToLegacyContent(blocks),
          blocks,
          custom_title: sections[sec.id]?.title || sec.title,
        });
      }

      toast.success("All changes saved!");
      setIsDirty(false);
      setSaving(false);
    } catch (err) {
      setSaving(false);
      const message =
        err.response?.data?.message ||
        (err.response?.data?.code === "ER_NO_SUCH_TABLE"
          ? "Database migration required: run 2026-05-22-add-document-section-blocks.sql"
          : null) ||
        err.message ||
        "Save failed";
      toast.error(message);
    }
  }, [documentId, documentTitle, getBlocksForSection, sections, template]);

  useEffect(() => {
    const handler = async (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        await saveAll();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveAll]);

  const validate = async () => {
    try {
      const res = await api.get(`/documents/${documentId}/validate`);
      const errMap = {};
      res.data.errors.forEach((e) => {
        errMap[e.section_id] = e.message;
      });
      setErrors(errMap);
      return Object.keys(errMap).length === 0;
    } catch {
      toast.error("Validation failed");
      return false;
    }
  };

  const handlePreview = async () => {
    await saveAll();
    const isValid = await validate();
    if (!isValid) return;
    const html = generatePrintHTML(template, sections, false);
    setPreviewHTML(html);
  };

  const handleExport = async () => {
    const html = generatePrintHTML(template, sections, true);
    try {
      const res = await api.post(
        "/export/pdf",
        { html },
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "document.pdf";
      link.click();
    } catch {
      toast.error("Export failed");
    }
  };

  const handleExportWord = async () => {
    try {
      const res = await api.post(
        "/export/word",
        { template, sections },
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "document.docx";
      link.click();
    } catch {
      toast.error("Word export failed");
    }
  };

  const figureLabels = useMemo(() => {
    if (!template) return new Map();
    return computeFigureLabels(template, sections).labels;
  }, [template, sections]);

  const tableLabels = useMemo(() => {
    if (!template) return new Map();
    return computeTableLabels(template, sections).labels;
  }, [template, sections]);

  const estimateSectionHeight = (sectionId) =>
    getBlocksForSection(sectionId).reduce((total, block) => {
      if (block.type === "image") return total + 290;
      if (block.type === "table") {
        const table = normalizeTableData(block.tableData);
        return total + 110 + table.rows.length * 44;
      }
      const text = block.text || "";
      const lineCount = Math.max(1, text.split("\n").length);
      return total + 44 + lineCount * 22 + text.length * 0.25;
    }, 120);

  const paginateSections = (sectionsList) => {
    const pages = [];
    let currentPage = [];
    let currentHeight = 0;

    sectionsList.forEach((sec) => {
      const estimatedHeight = estimateSectionHeight(sec.id);
      if (currentHeight + estimatedHeight > PAGE_HEIGHT && currentPage.length) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      currentPage.push(sec);
      currentHeight += estimatedHeight;
    });

    if (currentPage.length) pages.push(currentPage);
    return pages;
  };

  const renderAddControl = (sectionId, afterIndex) => {
    const menuKey = `between:${sectionId}:${afterIndex}`;

    return (
      <div className="block-add-row">
        <button
          type="button"
          className="block-add-button"
          onClick={() => setOpenAddMenu(openAddMenu === menuKey ? null : menuKey)}
          title="Add block"
        >
          <FiPlus />
        </button>
        {openAddMenu === menuKey && (
          <div className="block-add-menu">
            <button type="button" onClick={() => insertBlockAfter(sectionId, afterIndex, "paragraph")}>
              <FiType /> Text
            </button>
            <button type="button" onClick={() => insertBlockAfter(sectionId, afterIndex, "image")}>
              <FiImage /> Image
            </button>
            <button type="button" onClick={() => insertBlockAfter(sectionId, afterIndex, "table")}>
              <FiGrid /> Table
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderBlockActions = (sectionId, blockIndex, totalBlocks) => (
    <div className="block-actions">
      <button
        type="button"
        onClick={() => moveBlock(sectionId, blockIndex, -1)}
        disabled={blockIndex === 0}
        title="Move up"
      >
        <FiArrowUp />
      </button>
      <button
        type="button"
        onClick={() => moveBlock(sectionId, blockIndex, 1)}
        disabled={blockIndex === totalBlocks - 1}
        title="Move down"
      >
        <FiArrowDown />
      </button>
      <button
        type="button"
        onClick={() => deleteBlock(sectionId, blockIndex)}
        title="Delete block"
      >
        <FiTrash2 />
      </button>
    </div>
  );

  const renderBlock = (sec, block, blockIndex, totalBlocks) => {
    const blockKey = block.clientId || block.id || `${sec.id}-${blockIndex}`;
    const cursorMenuKey = `cursor:${sec.id}:${block.clientId || block.id}`;
    const blockClientId = block.clientId || block.id;
    const isParagraphFocused =
      focusedParagraph?.sectionId === sec.id &&
      focusedParagraph?.blockClientId === blockClientId;
    const isCursorMenuOpen = openAddMenu === cursorMenuKey;
    const showParagraphInsert = isParagraphFocused || isCursorMenuOpen;
    const caretTop = isParagraphFocused ? focusedParagraph.caretTop : 4;

    if (block.type === "image") {
      const figureKey = `${sec.id}:${block.clientId || block.id || blockIndex}`;
      const figureLabel = figureLabels.get(figureKey) || "Figure";
      const hasImage = Boolean(block.image?.src);

      return (
        <div key={blockKey} className="content-block image-content-block">
          <div className="block-type-icon"><FiImage /></div>
          <div className="image-block-body">
            <input
              ref={(node) => {
                if (node) imageFileInputRefs.current[blockKey] = node;
                else delete imageFileInputRefs.current[blockKey];
              }}
              type="file"
              accept="image/*"
              className="image-file-input-hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                handleImageFile(sec.id, blockIndex, event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div
              className={`image-preview-shell ${hasImage ? "has-image" : "is-empty"}`}
              role="button"
              tabIndex={0}
              onClick={() => triggerImageFilePicker(blockKey)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  triggerImageFilePicker(blockKey);
                }
              }}
              title={hasImage ? "Click to replace image" : "Click to upload image"}
            >
              {hasImage ? (
                <img src={block.image.src} alt={block.image.alt || figureLabel} />
              ) : (
                <div className="image-empty-state">
                  <FiUpload />
                  <span>Click to upload image</span>
                </div>
              )}
              {hasImage && <span className="image-preview-overlay">Click to replace</span>}
            </div>
            <div className="figure-caption-row">
              <span className="figure-number-label">{figureLabel}</span>
              <input
                ref={(node) => {
                  if (node) imageUrlRefs.current[blockKey] = node;
                  else delete imageUrlRefs.current[blockKey];
                }}
                className="figure-caption-input"
                value={block.image?.caption || ""}
                onChange={(e) =>
                  handleImageChange(sec.id, blockIndex, "caption", e.target.value)
                }
                placeholder="Caption description (editable)"
              />
            </div>
            <details className="image-advanced-fields">
              <summary>Image options</summary>
              <div className="image-fields">
                <input
                  value={block.image?.src || ""}
                  onChange={(e) =>
                    handleImageChange(sec.id, blockIndex, "src", e.target.value)
                  }
                  placeholder="Image URL"
                />
                <input
                  value={block.image?.alt || ""}
                  onChange={(e) =>
                    handleImageChange(sec.id, blockIndex, "alt", e.target.value)
                  }
                  placeholder="Alt text"
                />
                <button
                  type="button"
                  className="image-upload-button"
                  onClick={() => triggerImageFilePicker(blockKey)}
                >
                  <FiUpload /> {hasImage ? "Replace image" : "Upload image"}
                </button>
              </div>
            </details>
          </div>
          {renderBlockActions(sec.id, blockIndex, totalBlocks)}
        </div>
      );
    }

    if (block.type === "table") {
      const tableKey = `${sec.id}:${block.clientId || block.id || blockIndex}`;
      const tableLabel = tableLabels.get(tableKey) || "Table";
      const table = normalizeTableData(block.tableData, {
        caption: getDefaultTableCaption(sec.title),
      });
      const columnCount = getTableColumnCount(table.rows);

      return (
        <div key={blockKey} className="content-block table-content-block">
          <div className="block-type-icon"><FiGrid /></div>
          <div className="table-block-body">
            <div className="table-caption-row">
              <span className="table-number-label">{tableLabel}</span>
              <input
                className="table-caption-input"
                value={table.caption || ""}
                onChange={(e) =>
                  handleTableCaptionChange(sec.id, blockIndex, e.target.value)
                }
                placeholder="Caption description"
              />
            </div>

            <div className="table-controls">
              <label className="table-header-toggle">
                <input
                  type="checkbox"
                  checked={table.hasHeader}
                  onChange={() => toggleTableHeader(sec.id, blockIndex)}
                />
                Header row
              </label>
              <button
                type="button"
                className="table-action-button"
                onClick={() => addTableRow(sec.id, blockIndex)}
                disabled={table.rows.length >= MAX_TABLE_ROWS}
                title="Add row"
              >
                <FiPlus /> Row
              </button>
              <button
                type="button"
                className="table-action-button"
                onClick={() => removeTableRow(sec.id, blockIndex)}
                disabled={table.rows.length <= MIN_TABLE_ROWS}
                title="Remove last row"
              >
                <FiMinus /> Row
              </button>
              <button
                type="button"
                className="table-action-button"
                onClick={() => addTableColumn(sec.id, blockIndex)}
                disabled={columnCount >= MAX_TABLE_COLUMNS}
                title="Add column"
              >
                <FiPlus /> Column
              </button>
              <button
                type="button"
                className="table-action-button"
                onClick={() => removeTableColumn(sec.id, blockIndex)}
                disabled={columnCount <= MIN_TABLE_COLUMNS}
                title="Remove last column"
              >
                <FiMinus /> Column
              </button>
            </div>

            <div className="table-editor-scroll">
              <table className={`table-editor ${table.hasHeader ? "has-header" : ""}`}>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, columnIndex) => {
                        const Cell = table.hasHeader && rowIndex === 0 ? "th" : "td";

                        return (
                          <Cell key={`${rowIndex}-${columnIndex}`}>
                            <textarea
                              ref={(node) => {
                                if (rowIndex !== 0 || columnIndex !== 0) return;
                                if (node) tableCellRefs.current[blockKey] = node;
                                else delete tableCellRefs.current[blockKey];
                              }}
                              value={cell}
                              onChange={(e) =>
                                handleTableCellChange(
                                  sec.id,
                                  blockIndex,
                                  rowIndex,
                                  columnIndex,
                                  e.target.value,
                                )
                              }
                              onInput={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              className="table-cell-input"
                              rows={1}
                              placeholder={
                                table.hasHeader && rowIndex === 0
                                  ? `Column ${columnIndex + 1}`
                                  : ""
                              }
                            />
                          </Cell>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {renderBlockActions(sec.id, blockIndex, totalBlocks)}
        </div>
      );
    }

    return (
      <div
        key={blockKey}
        className={`content-block paragraph-content-block ${showParagraphInsert ? "is-focused" : ""}`}
      >
        <div className="block-gutter">
          <span className="block-type-icon"><FiType /></span>
        </div>
        <div className="paragraph-content-wrapper">
          {showParagraphInsert && (
            <div
              className="paragraph-insert-rail"
              style={{ top: `${caretTop}px` }}
            >
              <button
                type="button"
                className="inline-insert-button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  cancelParagraphBlur();
                }}
                onClick={() => openCursorAddMenu(sec.id, blockIndex, block)}
                title="Insert at cursor"
              >
                <FiPlus />
              </button>
              {isCursorMenuOpen && (
                <div
                  className="block-add-menu inline-add-menu"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <button type="button" onClick={() => insertBlockAtCursor("paragraph")}>
                    <FiType /> Text
                  </button>
                  <button type="button" onClick={() => insertBlockAtCursor("image")}>
                    <FiImage /> Image
                  </button>
                  <button type="button" onClick={() => insertBlockAtCursor("table")}>
                    <FiGrid /> Table
                  </button>
                </div>
              )}
            </div>
          )}
          <textarea
            ref={(node) => {
              if (node) textareaRefs.current[blockKey] = node;
              else delete textareaRefs.current[blockKey];
            }}
            placeholder="Start typing..."
            value={block.text || ""}
            onChange={(e) => {
              trackParagraphCaret(sec.id, blockIndex, block, e.currentTarget);
              handleParagraphChange(sec.id, blockIndex, e.target.value);
            }}
            onClick={(e) => {
              cancelParagraphBlur();
              trackParagraphCaret(sec.id, blockIndex, block, e.currentTarget);
            }}
            onFocus={(e) => {
              cancelParagraphBlur();
              trackParagraphCaret(sec.id, blockIndex, block, e.currentTarget);
            }}
            onBlur={clearParagraphFocusSoon}
            onKeyUp={(e) =>
              trackParagraphCaret(sec.id, blockIndex, block, e.currentTarget)
            }
            onSelect={(e) =>
              trackParagraphCaret(sec.id, blockIndex, block, e.currentTarget)
            }
            onKeyDown={(e) => handleParagraphKeyDown(e, sec.id, blockIndex, block)}
            className="editor-block-textarea"
            rows={1}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
              trackParagraphCaret(sec.id, blockIndex, block, e.currentTarget);
            }}
          />
        </div>
        {renderBlockActions(sec.id, blockIndex, totalBlocks)}
      </div>
    );
  };

  if (loadError) return <EasDocLoader message={loadError} />;
  if (!template) return <EasDocLoader message="Preparing Workspace" />;

  const numberedSections = buildSectionNumbers(template.sections);
  const pages = paginateSections(numberedSections);

  return (
    <div className="editor-workspace">
      {blocker.state === "blocked" && (
        <div className="preview-overlay">
          <div className="preview-modal unsaved-changes-modal">
            <h3>Unsaved Changes</h3>
            <p>You have unsaved changes. Do you want to save before leaving?</p>
            <div className="unsaved-changes-actions">
              <button 
                className="btn-modal-cancel" 
                onClick={() => blocker.reset()}
              >
                Cancel
              </button>
              <button 
                className="btn-modal-danger" 
                onClick={() => blocker.proceed()}
              >
                Don't Save
              </button>
              <button 
                className="btn-modal-save" 
                onClick={async () => {
                  await saveAll();
                  blocker.proceed();
                }}
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {previewHTML && (
        <div className="preview-overlay">
          <div className="preview-modal">
            <div className="preview-header">
              <h3>Document Preview</h3>
              <button className="close-preview" onClick={() => setPreviewHTML("")}>
                <FiX size={24} />
              </button>
            </div>
            <iframe title="preview" srcDoc={previewHTML} className="preview-frame" />
          </div>
        </div>
      )}

      <div className="editor-toolbar single-row-toolbar">
        <div className="toolbar-left">
          <div className="doc-icon-circle"><FiFileText /></div>
          <div className="title-group">
            <span className="template-label">Template - {template.name}</span>
            <input
              className="document-title-input"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Document name"
            />
          </div>
        </div>

        <div className="toolbar-right">
          <button
            onClick={saveAll}
            className={`btn-save-prominent ${saving ? "saving-pulse" : ""}`}
            disabled={saving}
          >
            <FiSave size={20} />
            <div className="save-btn-text">
              <span className="save-primary">Save Document</span>
              <span className="save-secondary">{saving ? "Saving..." : "All changes up to date"}</span>
            </div>
          </button>

          <div className="toolbar-tools-container" onMouseMove={resetToolsTimer}>
            <button 
              className="btn-tools-toggle"
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              title="More Actions"
            >
              <FiSettings size={22} />
            </button>
            
            {showToolsMenu && (
              <div className="tools-half-circle-menu">
                <button onClick={handlePreview} className="tool-btn prominent-tool">
                  <FiEye /> <span>Preview</span>
                </button>
                <button onClick={handleExport} className="tool-btn prominent-tool">
                  <FiDownload /> <span>PDF</span>
                </button>
                <button onClick={handleExportWord} className="tool-btn prominent-tool">
                  <BiSolidFileDoc /> <span>Word</span>
                </button>
                <button 
                  onClick={async () => {
                    const newStatus = status === "completed" ? "draft" : "completed";
                    if (newStatus === "completed") {
                      const isValid = await validate();
                      if (!isValid) return;
                    }
                    try {
                      await api.put(`/documents/${documentId}/status`, { status: newStatus });
                      setStatus(newStatus);
                      toast.success(`Document marked as ${newStatus}`);
                    } catch {
                      toast.error("Failed to update status");
                    }
                  }} 
                  className={`tool-btn prominent-tool ${status === "completed" ? "status-completed" : ""}`}
                >
                  <FiCheckCircle /> <span>{status === "completed" ? "Completed" : "Complete"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="document-scroller">
        {pages.map((page, pageIndex) => (
          <div key={pageIndex} className="page">
            {page.map((sec) => {
              const blocks = getBlocksForSection(sec.id);

              return (
                <div key={sec.id} className="section-block">
                  <div className={`section-header level-${sec.level}`}>
                    <span className="section-number">{sec.number}</span>
                    <input
                      value={sections[sec.id]?.title || sec.title}
                      onChange={(e) => handleTitleChange(sec.id, e.target.value)}
                      className="editor-title-input"
                    />
                  </div>
                  <div className={errors[sec.id] ? "section-blocks input-error" : "section-blocks"}>
                    {renderAddControl(sec.id, -1)}
                    {blocks.map((block, blockIndex) => (
                      <Fragment key={block.clientId || block.id || `${sec.id}-${blockIndex}`}>
                        {renderBlock(sec, block, blockIndex, blocks.length)}
                        {renderAddControl(sec.id, blockIndex)}
                      </Fragment>
                    ))}
                  </div>
                  {errors[sec.id] && <span className="error-text">{errors[sec.id]}</span>}
                </div>
              );
            })}
            <div className="page-footer">Page {pageIndex + 1}</div>
          </div>
        ))}
      </div>

      {showScrollTop && (
        <button className="scroll-top-fab" onClick={scrollToTop} title="Scroll to top">
          <FiChevronUp size={22} />
        </button>
      )}
    </div>
  );
};

export default Editor;
