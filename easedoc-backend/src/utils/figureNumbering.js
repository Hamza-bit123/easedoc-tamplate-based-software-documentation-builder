const STANDARD_RULES = {
  1: { prefix: "Figure", scope: "document", separator: " " },
  2: { prefix: "Figure", scope: "section", separator: "-", includeSectionNumber: true },
  3: { prefix: "Figure", scope: "section", separator: ".", includeSectionNumber: true },
  4: { prefix: "Figure", scope: "section", separator: ".", includeSectionNumber: true },
  5: { prefix: "Figure", scope: "section", separator: "-", includeSectionNumber: true },
  6: { prefix: "Figure", scope: "section", separator: "-", includeSectionNumber: true },
};

const DOCUMENT_TYPE_RULES = {
  SRS: { preferDocumentScopeForStandards: [1] },
  SDS: { forceSectionScope: true },
  SDD: { forceSectionScope: true },
};

export const getFigureNumberingRule = (template = {}) => {
  const standardId = Number(template.standard_id) || 1;
  const documentType = `${template.document_type_name || ""}`.trim().toUpperCase();
  const base = { ...(STANDARD_RULES[standardId] || STANDARD_RULES[1]) };

  const typeRule = DOCUMENT_TYPE_RULES[documentType];
  if (typeRule?.forceSectionScope) {
    return {
      ...base,
      scope: "section",
      includeSectionNumber: true,
    };
  }

  if (
    typeRule?.preferDocumentScopeForStandards?.includes(standardId) &&
    base.scope !== "section"
  ) {
    return { ...base, scope: "document", includeSectionNumber: false };
  }

  return base;
};

export const buildSectionNumbers = (sectionsList = []) => {
  const counters = {};

  return sectionsList.map((sec) => {
    const level = sec.level || 1;
    if (!counters[level]) counters[level] = 0;
    counters[level] += 1;

    for (let i = level + 1; i <= 10; i += 1) {
      counters[i] = 0;
    }

    const number = Object.keys(counters)
      .slice(0, level)
      .map((lvl) => counters[lvl] || 0)
      .join(".");

    return { ...sec, number };
  });
};

const getSectionBlocks = (contentObj = {}) => {
  if (Array.isArray(contentObj.blocks) && contentObj.blocks.length > 0) {
    return contentObj.blocks;
  }

  if (contentObj.content) {
    return [{ type: "paragraph", text: contentObj.content }];
  }

  return [];
};

const blockRegistryKey = (sectionId, block, blockIndex) =>
  `${sectionId}:${block.clientId || block.id || blockIndex}`;

const withPrefix = (rule, prefix) => ({
  ...rule,
  prefix,
});

const computeBlockLabels = (template, sectionsState, blockType, rule) => {
  const numberedSections = buildSectionNumbers(template.sections || []);
  const labels = new Map();
  let documentCounter = 0;
  const sectionCounters = {};

  numberedSections.forEach((sec) => {
    const blocks = getSectionBlocks(sectionsState[sec.id] || {});

    blocks.forEach((block, blockIndex) => {
      if ((block.type || block.block_type) !== blockType) return;

      const key = blockRegistryKey(sec.id, block, blockIndex);
      let label;

      if (rule.scope === "document") {
        documentCounter += 1;
        label = `${rule.prefix} ${documentCounter}`;
      } else {
        const sectionNumber = sec.number;
        sectionCounters[sectionNumber] = (sectionCounters[sectionNumber] || 0) + 1;
        const itemIndex = sectionCounters[sectionNumber];
        label = rule.includeSectionNumber
          ? `${rule.prefix} ${sectionNumber}${rule.separator}${itemIndex}`
          : `${rule.prefix} ${itemIndex}`;
      }

      labels.set(key, label);
    });
  });

  return { labels, rule };
};

export const computeFigureLabels = (template, sectionsState = {}) => {
  const rule = getFigureNumberingRule(template);
  return computeBlockLabels(template, sectionsState, "image", rule);
};

export const computeTableLabels = (template, sectionsState = {}) => {
  const rule = withPrefix(getFigureNumberingRule(template), "Table");
  return computeBlockLabels(template, sectionsState, "table", rule);
};

export const formatExportedFigureCaption = (label, userCaption = "") => {
  const text = `${userCaption || ""}`.trim();
  if (!text) return label;
  if (text.toLowerCase().startsWith(label.toLowerCase())) return text;
  return `${label}: ${text}`;
};

export const formatExportedTableCaption = formatExportedFigureCaption;
