import { apiGet, isApiConnected } from "./api";

export async function getDailyMarketBrief() {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return apiGet({ action: "getDailyMarketBrief" });
}

const SECTION_HEADING_PATTERNS = {
  overview: [/^(?:#{1,6}\s*|\d+[.)、]\s*|[一二三四五六七八九十]+、\s*)?(今日市场速览|今日市场概览|today(?:'s)? market overview)\s*[:：]?$/i],
  regions: [/^(?:#{1,6}\s*|\d+[.)、]\s*|[一二三四五六七八九十]+、\s*)?(各区域租金概况|median asking rent by area \+ bedroom type)\s*[:：]?$/i],
  marketplace: [/^.*facebook marketplace.*实盘快照.*$/i, /^(?:#{1,6}\s*|\d+[.)、]\s*|[一二三四五六七八九十]+、\s*)?facebook marketplace snapshot\s*[:：]?$/i],
  comparison: [/^(?:#{1,6}\s*|\d+[.)、]\s*|[一二三四五六七八九十]+、\s*)?(marketplace 与主流平台价格对比|和日报中位价的对比|marketplace vs\.? major platforms)\s*[:：]?$/i],
  signals: [/^(?:#{1,6}\s*|\d+[.)、]\s*|[一二三四五六七八九十]+、\s*)?(市场信号|market signals)\s*[:：]?$/i],
  landlord: [/^(?:#{1,6}\s*|\d+[.)、]\s*|[一二三四五六七八九十]+、\s*)?(今日房东参考|landlord reference|下一步自动化)\s*[:：]?$/i],
  sources: [/^(?:#{1,6}\s*|\d+[.)、]\s*|[一二三四五六七八九十]+、\s*)?(数据来源|data sources)\s*[:：]?$/i],
};

const SOURCE_LINE_PATTERN = /^(generated automatically\.\s*)?source\s*[:：]/i;
const SHARED_RENTAL_PATTERN = /(\$650\/room|\$800\/room|合租|shared|room\b)/i;
const EMPTY_REPORT_LINE_PATTERN = /^[\s—-]*$/;

function normalizedReportLines(content) {
  return String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !EMPTY_REPORT_LINE_PATTERN.test(line));
}

function findHeadingIndex(lines, sectionId, startAt = 0) {
  const patterns = SECTION_HEADING_PATTERNS[sectionId] || [];
  return lines.findIndex((line, index) => index >= startAt && patterns.some((pattern) => pattern.test(line)));
}

function lineIsSource(line) {
  return SOURCE_LINE_PATTERN.test(line);
}

function nonEmptyLines(lines) {
  return lines.filter((line) => line && !EMPTY_REPORT_LINE_PATTERN.test(line));
}

function sectionFromRange(lines, startAt, endAt, headingIndex = -1) {
  const contentStart = headingIndex >= startAt ? headingIndex + 1 : startAt;
  return nonEmptyLines(lines.slice(contentStart, endAt).filter((line) => !lineIsSource(line)));
}

function splitMarketplaceSections(lines) {
  const headingPrefix = "^(?:#{1,6}\\s*|\\d+[.)、]\\s*|[一二三四五六七八九十]+、\\s*)?";
  const rentalHeadingIndex = lines.findIndex((line) => new RegExp(`${headingPrefix}(整租市场|entire rental market)\\s*[:：]?$`, "i").test(line));
  const sharedHeadingIndex = lines.findIndex((line) => new RegExp(`${headingPrefix}(合租市场|shared rental market)(?:（[^）]*）)?\\s*[:：]?$`, "i").test(line));
  const firstSubsectionIndex = [rentalHeadingIndex, sharedHeadingIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];

  if (rentalHeadingIndex >= 0 || sharedHeadingIndex >= 0) {
    const ordered = [
      { id: "rental", titleZh: "整租市场", titleEn: "Entire Rental Market", index: rentalHeadingIndex },
      { id: "shared", titleZh: "合租市场", titleEn: "Shared Rental Market", index: sharedHeadingIndex },
    ].filter((item) => item.index >= 0).sort((a, b) => a.index - b.index);

    return {
      introLines: firstSubsectionIndex >= 0 ? lines.slice(0, firstSubsectionIndex) : [],
      subsections: ordered.map((item, position) => ({
        ...item,
        lines: nonEmptyLines(
          lines.slice(item.index + 1, ordered[position + 1]?.index ?? lines.length)
            .filter((line) => !lineIsSource(line)),
        ),
      })).filter((item) => item.lines.length > 0),
    };
  }

  const rentalLines = lines.filter((line) => !SHARED_RENTAL_PATTERN.test(line));
  const sharedLines = lines.filter((line) => SHARED_RENTAL_PATTERN.test(line));

  return {
    introLines: [],
    subsections: [
      rentalLines.length > 0 ? { id: "rental", titleZh: "整租市场", titleEn: "Entire Rental Market", lines: rentalLines } : null,
      sharedLines.length > 0 ? { id: "shared", titleZh: "合租市场", titleEn: "Shared Rental Market", lines: sharedLines } : null,
    ].filter(Boolean),
  };
}

function makeSection(id, titleZh, titleEn, lines, rawHeading = "") {
  const cleanedLines = nonEmptyLines(lines.filter((line) => !lineIsSource(line)));
  return cleanedLines.length > 0 ? { id, titleZh, titleEn, lines: cleanedLines, rawHeading } : null;
}

export function parseDailyMarketBrief(brief) {
  const lines = normalizedReportLines(brief?.fullContent);
  const reportTitle = String(brief?.title || "").trim();
  if (reportTitle && lines[0] === reportTitle) lines.shift();

  const headingIndexes = Object.fromEntries(
    Object.keys(SECTION_HEADING_PATTERNS).map((sectionId) => [sectionId, findHeadingIndex(lines, sectionId)]),
  );
  const firstIndex = (...indexes) => indexes.filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? lines.length;
  const sourceLines = lines.filter(lineIsSource);
  const sourceHeadingIndex = headingIndexes.sources;

  const regionsStart = headingIndexes.regions >= 0
    ? headingIndexes.regions
    : lines.findIndex((line) => /^(?:#{1,6}\s*|\d+[.)、]\s*|[一二三四五六七八九十]+、\s*)?median asking rent by area \+ bedroom type\s*[:：]?$/i.test(line));
  const marketplaceStart = headingIndexes.marketplace;
  const comparisonStart = headingIndexes.comparison;
  const landlordStart = headingIndexes.landlord;
  const sourcesStart = sourceHeadingIndex >= 0 ? sourceHeadingIndex : lines.length;

  const signalLines = headingIndexes.signals >= 0
    ? sectionFromRange(lines, headingIndexes.signals, firstIndex(landlordStart, sourcesStart), headingIndexes.signals)
    : lines.filter((line) => /^(new in last 24h|incentives being offered|days-on-market trend|no meaningful change since yesterday)/i.test(line));

  const sections = [
    makeSection(
      "overview",
      "今日市场速览",
      "Today's Market Overview",
      sectionFromRange(lines, 0, regionsStart >= 0 ? regionsStart : firstIndex(marketplaceStart, comparisonStart, sourcesStart), headingIndexes.overview),
    ),
    makeSection(
      "regions",
      "各区域租金概况",
      "Regional Rental Overview",
      sectionFromRange(lines, regionsStart >= 0 ? regionsStart : 0, firstIndex(marketplaceStart, comparisonStart, landlordStart, sourcesStart), headingIndexes.regions >= 0 ? headingIndexes.regions : -1)
        .filter((line) => !signalLines.includes(line)),
    ),
    makeSection(
      "marketplace",
      "Facebook Marketplace 实盘快照",
      "Facebook Marketplace Snapshot",
      sectionFromRange(lines, marketplaceStart >= 0 ? marketplaceStart : lines.length, firstIndex(comparisonStart, landlordStart, sourcesStart), marketplaceStart),
    ),
    makeSection(
      "comparison",
      "Marketplace 与主流平台价格对比",
      "Marketplace vs. Major Platforms",
      sectionFromRange(lines, comparisonStart >= 0 ? comparisonStart : lines.length, firstIndex(landlordStart, sourcesStart), comparisonStart),
    ),
    makeSection(
      "signals",
      "市场信号",
      "Market Signals",
      signalLines,
      headingIndexes.signals >= 0 ? lines[headingIndexes.signals] : "",
    ),
    makeSection(
      "landlord",
      "今日房东参考",
      "Today's Landlord Reference",
      sectionFromRange(lines, landlordStart >= 0 ? landlordStart : lines.length, sourcesStart, landlordStart),
      landlordStart >= 0 ? lines[landlordStart] : "",
    ),
    makeSection(
      "sources",
      "数据来源",
      "Data Sources",
      sourceHeadingIndex >= 0 ? lines.slice(sourceHeadingIndex + 1) : sourceLines,
      sourceHeadingIndex >= 0 ? lines[sourceHeadingIndex] : "",
    ),
  ].filter(Boolean);

  const marketplace = sections.find((section) => section.id === "marketplace");
  if (marketplace) {
    const marketplaceParts = splitMarketplaceSections(marketplace.lines);
    marketplace.introLines = marketplaceParts.introLines;
    marketplace.subsections = marketplaceParts.subsections;
  }

  return { sections, raw: String(brief?.fullContent || "") };
}

export async function getWebsiteReport(reportId) {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return apiGet({ action: "getWebsiteReport", reportId });
}
