import test from "node:test";
import assert from "node:assert/strict";
import { validateModelAnswer } from "../src/server/answer-validation.ts";

const citation = {
  articleId: "labor-contract-law-0046",
  lawId: "labor-contract-law",
  lawTitle: "中华人民共和国劳动合同法",
  category: "法律",
  articleNumber: 46,
  displayNumber: "第四十六条",
  path: ["第四章劳动合同的解除和终止"],
  text: "有下列情形之一的，用人单位应当向劳动者支付经济补偿……",
  effectiveDate: "2013-07-01",
  status: "effective",
  sourceUrl: "https://flk.npc.gov.cn/",
};

test("keeps only cited articles from the retrieval whitelist", () => {
  const answer = validateModelAnswer(
    {
      status: "answered",
      conclusion: "符合法定情形时，用人单位应支付经济补偿。",
      analysis: ["是否支付取决于解除方式和具体事实。"],
      basis: [
        { articleId: citation.articleId, point: "列举了支付经济补偿的情形。" },
        { articleId: "invented-article-9999", point: "不存在的引用。" },
      ],
    },
    "公司解除劳动合同需要支付经济补偿吗？",
    [citation],
  );

  assert.equal(answer.status, "answered");
  assert.equal(answer.basis.length, 1);
  assert.equal(answer.basis[0].articleId, citation.articleId);
});

test("downgrades an answer without a valid citation", () => {
  const answer = validateModelAnswer(
    {
      status: "answered",
      conclusion: "用人单位必须支付赔偿金。",
      basis: [{ articleId: "invented-article-9999", point: "无依据" }],
    },
    "公司解除劳动合同需要支付赔偿金吗？",
    [citation],
  );

  assert.equal(answer.status, "insufficient_sources");
  assert.equal(answer.basis.length, 0);
});
