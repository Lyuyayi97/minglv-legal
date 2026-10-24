import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchTokens,
  chineseNumberToInteger,
  detectLegalDomain,
  extractArticleNumber,
  extractLawMention,
} from "../src/server/legal-text.ts";

test("converts Chinese article numbers", () => {
  assert.equal(chineseNumberToInteger("五百七十七"), 577);
  assert.equal(chineseNumberToInteger("一千零二十四"), 1024);
  assert.equal(chineseNumberToInteger("第十"), 10);
});

test("extracts law and article mentions", () => {
  const question = "《中华人民共和国民法典》第五百七十七条规定了什么？";
  assert.equal(extractLawMention(question), "中华人民共和国民法典");
  assert.equal(extractArticleNumber(question), 577);
});

test("prioritizes legal vocabulary in search tokens", () => {
  const tokens = buildSearchTokens("公司辞退我，是否需要支付经济补偿和赔偿金？");
  assert.ok(tokens.includes("经济补偿"));
  assert.ok(tokens.includes("赔偿金"));
  assert.ok(tokens.length <= 18);
});

test("distinguishes rental questions from labor questions", () => {
  assert.equal(
    detectLegalDomain("租房合同没到期房东要收房怎么办？")?.id,
    "rental",
  );
  assert.equal(
    detectLegalDomain("被公司辞退后经济补偿怎么算？")?.id,
    "labor",
  );
});
