import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import "./Editor.css";
import generatePrintHTML from "../utils/generatePrintHTML";
import {
  FiArrowDown,
  FiArrowUp,
  FiChevronUp,
  FiDownload,
  FiEye,
  FiFileText,
  FiImage,
  FiPlus,
  FiSave,
  FiTrash2,
  FiType,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { BiSolidFileDoc } from "react-icons/bi";
import toast from "react-hot-toast";

const newBlockId = () =>
  `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createParagraphBlock = (text = "") => ({
  clientId: newBlockId(),
  type: "paragraph",
  text,
  image: { src: "", alt: "", caption: "" },
  tableData: null,
});

const createImageBlock = () => ({
  clientId: newBlockId(),
  type: "image",
  text: "",
  image: { src: "", alt: "", caption: "" },
  tableData: null,
});

const createBlockByType = (type) =>
  type === "image" ? createImageBlock() : createParagraphBlock();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
      metadata: block.metadata || null,
    };
  }

  if ((block.type || block.block_type) === "table") {
    return {
      clientId: block.id || newBlockId(),
      id: block.id,
      type: "table",
      text: "",
      image: { src: "", alt: "", caption: "" },
      tableData: block.tableData || block.table_data || null,
      metadata: block.metadata || null,
    };
  }

  return {
    clientId: block.id || newBlockId(),
    id: block.id,
    type: "paragraph",
    text: block.text ?? block.text_content ?? block.content ?? "",
    image: { src: "", alt: "", caption: "" },
    tableData: null,
    metadata: block.metadata || null,
  };
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
      tableData: block.tableData || null,
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

const Editor = () => {
  const { documentId } = useParams();

  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState({});
  const [errors, setErrors] = useState({});
  const [previewHTML, setPreviewHTML] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("draft");
  const [documentTitle, setDocumentTitle] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [openAddMenu, setOpenAddMenu] = useState(null);
  const [insertionTarget, setInsertionTarget] = useState(null);
  const textareaRefs = useRef({});
  const imageUrlRefs = useRef({});
  const pendingFocusRef = useRef(null);
  const PAGE_HEIGHT = 1122;

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
        : textareaRefs.current[pending.clientId];

    if (!node) return;

    node.focus();

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
        const saved = savedSections.get(templateSection.id);
        map[templateSection.id] = {
          title: saved?.custom_title || "",
          blocks: normalizeSectionBlocks(saved),
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
    setSections((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        title: value,
      },
    }));
  };

  const updateBlocks = (sectionId, updater) => {
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

  const handleImageChange = (sectionId, blockIndex, field, value) => {
    updateBlocks(sectionId, (blocks) =>
      blocks.map((block, index) =>
        index === blockIndex
          ? {
              ...block,
              image: {
                ...block.image,
                [field]: value,
              },
            }
          : block,
      ),
    );
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
  };

  const insertBlockAfter = (sectionId, afterIndex, type) => {
    const block = createBlockByType(type);

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

    const insertedBlock = createBlockByType(type);

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
      } else if (!hasBefore && type === "image") {
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

  const handleImageFile = (sectionId, blockIndex, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleImageChange(sectionId, blockIndex, "src", reader.result || "");
    };
    reader.readAsDataURL(file);
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
      setSaving(false);
    } catch {
      setSaving(false);
      toast.error("Save failed");
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

  const generateNumbering = (sectionsList) => {
    const counters = {};
    return sectionsList.map((sec) => {
      const level = sec.level || 1;
      if (!counters[level]) counters[level] = 0;
      counters[level]++;
      for (let i = level + 1; i <= 10; i++) counters[i] = 0;
      const number = Object.keys(counters)
        .slice(0, level)
        .map((lvl) => counters[lvl] || 0)
        .join(".");
      return { ...sec, number };
    });
  };

  const estimateSectionHeight = (sectionId) =>
    getBlocksForSection(sectionId).reduce((total, block) => {
      if (block.type === "image") return total + 290;
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
    const isCursorActive =
      insertionTarget?.sectionId === sec.id &&
      insertionTarget?.blockClientId === (block.clientId || block.id);

    if (block.type === "image") {
      return (
        <div key={blockKey} className="content-block image-content-block">
          <div className="block-type-icon"><FiImage /></div>
          <div className="image-block-body">
            <div className="image-preview-shell">
              {block.image?.src ? (
                <img src={block.image.src} alt={block.image.alt || ""} />
              ) : (
                <div className="image-empty-state"><FiImage /></div>
              )}
            </div>
            <div className="image-fields">
              <input
                ref={(node) => {
                  if (node) imageUrlRefs.current[blockKey] = node;
                  else delete imageUrlRefs.current[blockKey];
                }}
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
              <input
                value={block.image?.caption || ""}
                onChange={(e) =>
                  handleImageChange(sec.id, blockIndex, "caption", e.target.value)
                }
                placeholder="Caption"
              />
              <label className="image-upload-button">
                <FiUpload /> Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageFile(sec.id, blockIndex, e.target.files?.[0])
                  }
                />
              </label>
            </div>
          </div>
          {renderBlockActions(sec.id, blockIndex, totalBlocks)}
        </div>
      );
    }

    return (
      <div
        key={blockKey}
        className={`content-block paragraph-content-block ${isCursorActive ? "is-active" : ""}`}
      >
        <div className="block-gutter">
          <button
            type="button"
            className="inline-insert-button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => openCursorAddMenu(sec.id, blockIndex, block)}
            title="Insert at cursor"
          >
            <FiPlus />
          </button>
          <span className="block-type-icon"><FiType /></span>
          {openAddMenu === cursorMenuKey && (
            <div className="block-add-menu inline-add-menu">
              <button type="button" onClick={() => insertBlockAtCursor("paragraph")}>
                <FiType /> Text
              </button>
              <button type="button" onClick={() => insertBlockAtCursor("image")}>
                <FiImage /> Image
              </button>
            </div>
          )}
        </div>
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
          onClick={(e) =>
            trackParagraphCaret(sec.id, blockIndex, block, e.currentTarget)
          }
          onFocus={(e) =>
            trackParagraphCaret(sec.id, blockIndex, block, e.currentTarget)
          }
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
          }}
        />
        {renderBlockActions(sec.id, blockIndex, totalBlocks)}
      </div>
    );
  };

  if (loadError) return <div className="editor-loading"><p>{loadError}</p></div>;
  if (!template) {
    return (
      <div className="editor-loading">
        <div className="loader"></div>
        <p>Preparing Workspace...</p>
      </div>
    );
  }

  const numberedSections = generateNumbering(template.sections);
  const pages = paginateSections(numberedSections);

  return (
    <div className="editor-workspace">
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

      <div className="editor-toolbar">
        <div className="toolbar-row toolbar-row-title">
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

        <div className="toolbar-row toolbar-row-actions">
          <button
            onClick={saveAll}
            className={`btn-save ${saving ? "saving-pulse" : ""}`}
            disabled={saving}
          >
            <FiSave /> {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={handlePreview} className="btn-secondary"><FiEye /> Preview</button>
          <div className="divider"></div>
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
            className="btn-secondary"
            style={
              status === "completed"
                ? { background: "#10b981", color: "white", borderColor: "#10b981" }
                : {}
            }
          >
            {status === "completed" ? "Completed" : "Mark as Completed"}
          </button>
          <button onClick={handleExport} className="btn-export"><FiDownload /> PDF</button>
          <button onClick={handleExportWord} className="btn-export"><BiSolidFileDoc /> Word</button>
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
