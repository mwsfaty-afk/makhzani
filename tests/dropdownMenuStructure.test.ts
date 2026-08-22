import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/**
 * حارس بنيوي (structural regression guard) ضد الخطأ الذي كان يُسقِط الصفحة كاملة عند فتح
 * قائمة المستخدم (topbar.tsx): استخدام <DropdownMenuLabel> مباشرة داخل <DropdownMenuContent>
 * بدون تغليفه بـ <DropdownMenuGroup> (أو <DropdownMenuRadioGroup>) يجعل Base UI يرمي
 * استثناءً غير مُلتقَط أثناء الرندر — يفحص هذا الاختبار شجرة الـ AST الفعلية (لا نص خام)
 * عبر TypeScript compiler API الموجود أصلًا كتبعية، دون إضافة أي تبعية جديدة، ودون الحاجة
 * لبيئة DOM/jsdom لتشغيل مكوّن React فعليًا.
 */

const SRC_DIR = join(__dirname, "..", "src");
const GROUP_TAGS = new Set(["DropdownMenuGroup", "DropdownMenuRadioGroup"]);

function listTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...listTsxFiles(full));
    } else if (entry.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

function getJsxTagName(node: ts.JsxOpeningLikeElement): string {
  const tag = node.tagName;
  return ts.isIdentifier(tag) ? tag.text : tag.getText();
}

/** يرجع قائمة الأسطر التي تحتوي DropdownMenuLabel بدون أن يكون أي سلف له
 * DropdownMenuGroup/DropdownMenuRadioGroup ضمن نفس DropdownMenuContent. */
function findUngroupedLabels(filePath: string): number[] {
  const text = readFileSync(filePath, "utf8");
  if (!text.includes("DropdownMenuLabel")) return [];

  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: number[] = [];
  const groupAncestryStack: boolean[] = [];

  function visit(node: ts.Node) {
    let pushedGroup = false;

    if (ts.isJsxElement(node)) {
      const tagName = getJsxTagName(node.openingElement);
      if (tagName === "DropdownMenuLabel") {
        const isInsideGroup = groupAncestryStack.some(Boolean);
        if (!isInsideGroup) {
          violations.push(sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1);
        }
      }
      if (GROUP_TAGS.has(tagName)) pushedGroup = true;
      groupAncestryStack.push(pushedGroup);
    } else if (ts.isJsxSelfClosingElement(node)) {
      const tagName = getJsxTagName(node);
      if (tagName === "DropdownMenuLabel") {
        const isInsideGroup = groupAncestryStack.some(Boolean);
        if (!isInsideGroup) {
          violations.push(sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1);
        }
      }
    }

    ts.forEachChild(node, visit);

    if (ts.isJsxElement(node)) {
      groupAncestryStack.pop();
    }
  }

  visit(sourceFile);
  return violations;
}

describe("Dropdown menu structure — regression guard for the crashing username menu bug", () => {
  it("every <DropdownMenuLabel> in the codebase is nested inside a <DropdownMenuGroup> (or <DropdownMenuRadioGroup>)", () => {
    const files = listTsxFiles(SRC_DIR);
    const failures: { file: string; lines: number[] }[] = [];

    for (const file of files) {
      const lines = findUngroupedLabels(file);
      if (lines.length > 0) failures.push({ file, lines });
    }

    if (failures.length > 0) {
      const details = failures.map((f) => `${f.file}: lines ${f.lines.join(", ")}`).join("\n");
      throw new Error(
        `Found <DropdownMenuLabel> used outside a <DropdownMenuGroup> — this throws an uncaught ` +
          `"MenuGroupContext is missing" error from Base UI at render time and crashes the whole page ` +
          `(the exact bug fixed in src/components/topbar.tsx during Phase 18):\n${details}`
      );
    }

    expect(failures).toEqual([]);
  });
});
