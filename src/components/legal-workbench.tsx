"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  BriefcaseBusiness,
  CarFront,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  HeartHandshake,
  History,
  House,
  Landmark,
  LoaderCircle,
  Phone,
  Plus,
  Scale,
  ShieldCheck,
  ShoppingBag,
  X,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type {
  AnswerStatus,
  Citation,
  HealthPayload,
  LegalAnswer,
} from "@/server/types";

type SavedCase = {
  id: string;
  question: string;
  answer: LegalAnswer;
  savedAt: string;
};

type ConversationTurn = {
  question: string;
  conclusion: string;
};

type Topic = {
  title: string;
  description: string;
  question: string;
  icon: LucideIcon;
};

const TOPICS: Topic[] = [
  {
    title: "劳动用工",
    description: "辞退、补偿、工资与社保",
    question: "被公司突然辞退，能拿到经济补偿吗？",
    icon: BriefcaseBusiness,
  },
  {
    title: "租房住房",
    description: "押金、退租、维修与租约",
    question: "房东不退押金，我该怎么维权？",
    icon: House,
  },
  {
    title: "婚姻家事",
    description: "离婚、抚养、财产与继承",
    question: "婚后父母出资买房，离婚时房子怎么分？",
    icon: HeartHandshake,
  },
  {
    title: "消费维权",
    description: "退货、赔偿、预付与网购",
    question: "网购商品有问题，怎样退货并保留证据？",
    icon: ShoppingBag,
  },
  {
    title: "交通事故",
    description: "责任认定、保险与损害赔偿",
    question: "发生交通事故后，第一步应该做什么？",
    icon: CarFront,
  },
  {
    title: "借贷纠纷",
    description: "借款、利息、担保与证据",
    question: "朋友借钱不还，聊天记录能作为证据吗？",
    icon: Landmark,
  },
];

const QUICK_QUESTIONS = [
  "公司不给加班费怎么办？",
  "租房合同没到期房东要收房怎么办？",
  "买到过期食品可以要求赔偿吗？",
];

const STATUS_LABELS: Record<AnswerStatus, string> = {
  answered: "可以初步判断",
  needs_facts: "还要补充情况",
  not_legal: "不属于法律问题",
  insufficient_sources: "暂未找到依据",
  not_configured: "法条已找到",
};

function readSavedCases() {
  try {
    const value = window.localStorage.getItem("legal-workbench-cases-v1");
    return value ? (JSON.parse(value) as SavedCase[]) : [];
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  if (!value) return "日期未载";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function citationLabel(citation: Citation) {
  return `《${citation.lawTitle.replace(/^中华人民共和国/, "")}》${citation.displayNumber}`;
}

function BrandMark() {
  return (
    <span className="brand" aria-label="明律法律科普与求助">
      <span className="brand-seal" aria-hidden="true">
        明
      </span>
      <span className="brand-copy">
        <strong>明律</strong>
        <small>法律科普与求助</small>
      </span>
    </span>
  );
}

function StatusBadge({ status }: { status: AnswerStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function QuestionForm({
  value,
  onChange,
  onSubmit,
  loading,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  compact?: boolean;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = areaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, compact ? 150 : 230)}px`;
  }, [value, compact]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!loading && value.trim().length >= 2) onSubmit();
  };

  return (
    <form
      className={`question-form ${compact ? "question-form-compact" : ""}`}
      onSubmit={submit}
      aria-busy={loading}
    >
      <div className="question-input-wrap">
        <textarea
          id={compact ? "follow-up-question" : "research-question"}
          ref={areaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            compact
              ? "补充事实，或者继续问下一步……"
              : "例如：公司突然通知我离职，但没有说明理由，也没有给补偿……"
          }
          rows={compact ? 1 : 3}
          maxLength={2000}
          disabled={loading}
          aria-label={compact ? "继续补充问题" : "描述你遇到的法律问题"}
        />
        <button
          className="submit-button"
          type="submit"
          disabled={loading || value.trim().length < 2}
          title={loading ? "正在核对法规" : "提交问题"}
          aria-label={loading ? "正在核对法规" : "提交问题"}
        >
          {loading ? (
            <LoaderCircle className="spin" size={20} aria-hidden="true" />
          ) : (
            <ArrowUp size={20} aria-hidden="true" />
          )}
        </button>
      </div>
      {compact ? null : (
        <div className="question-meta">
          <span>
            <ShieldCheck size={14} aria-hidden="true" />
            每个结论都会对应到现行法条
          </span>
          <span>{value.length}/2000</span>
        </div>
      )}
    </form>
  );
}

function LegalAidBand() {
  return (
    <section className="help-band" aria-label="公共法律服务">
      <div className="help-band-icon">
        <Phone size={22} aria-hidden="true" />
      </div>
      <div className="help-band-copy">
        <span>需要人工帮助</span>
        <h2>可以联系当地公共法律服务中心</h2>
        <p>涉及人身安全、诉讼期限或复杂案件，建议尽快咨询执业律师。</p>
      </div>
      <a href="tel:12348" className="help-band-action">
        拨打 12348
        <ArrowRight size={17} aria-hidden="true" />
      </a>
    </section>
  );
}

function SourcePanel({
  citations,
  selected,
  onSelect,
  onClose,
  mobile = false,
}: {
  citations: Citation[];
  selected: Citation | null;
  onSelect: (citation: Citation) => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copySelected = async () => {
    if (!selected) return;
    const text = `${citationLabel(selected)}\n${selected.text}\n${selected.sourceUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className={`source-panel ${mobile ? "source-panel-mobile" : ""}`}>
      <header className="source-header">
        <div>
          <span>法条核验</span>
          <h2>原文与依据</h2>
        </div>
        <div className="source-header-actions">
          <span className="source-count">{citations.length}</span>
          {mobile ? (
            <button
              className="icon-button"
              type="button"
              onClick={onClose}
              title="关闭依据面板"
              aria-label="关闭依据面板"
            >
              <X size={19} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      {selected ? (
        <section className="selected-source">
          <div className="selected-source-meta">
            <span>{selected.category}</span>
            <span>{selected.status === "effective" ? "现行有效" : selected.status}</span>
          </div>
          <h3>{citationLabel(selected)}</h3>
          {selected.path.length > 0 ? <p>{selected.path.join(" / ")}</p> : null}
          <blockquote>{selected.text}</blockquote>
          <div className="source-detail-meta">
            <span>施行 {formatDate(selected.effectiveDate)}</span>
            <span>{selected.articleId}</span>
          </div>
          <div className="source-actions">
            <button className="quiet-button" type="button" onClick={copySelected}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "已复制" : "复制条文"}
            </button>
            <a
              className="quiet-button"
              href={selected.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={15} />
              官方来源
            </a>
          </div>
        </section>
      ) : (
        <div className="source-empty">
          <BookOpen size={22} aria-hidden="true" />
          <p>提问后在这里核对法条原文。</p>
        </div>
      )}

      <div className="source-list" aria-label="检索到的法条">
        {citations.map((citation, index) => (
          <button
            type="button"
            key={citation.articleId}
            className={`source-row ${selected?.articleId === citation.articleId ? "is-active" : ""}`}
            onClick={() => onSelect(citation)}
          >
            <span className="source-row-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="source-row-copy">
              <strong>《{citation.lawTitle.replace(/^中华人民共和国/, "")}》</strong>
              <span>{citation.displayNumber}</span>
            </span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
    </aside>
  );
}

function AnswerDocument({
  answer,
  onCitation,
  onOpenSources,
}: {
  answer: LegalAnswer;
  onCitation: (citation: Citation) => void;
  onOpenSources: () => void;
}) {
  return (
    <article className="answer-document">
      {answer.status === "not_configured" ? (
        <div className="configuration-note" role="status">
          <AlertCircle size={19} aria-hidden="true" />
          <div>
            <strong>法条已经找到，智能解释还没开启</strong>
            <p>
              配置 <code>.env.local</code> 中的
              <code>LEGAL_LLM_BASE_URL</code>、<code>LEGAL_LLM_API_KEY</code>
              和 <code>LEGAL_LLM_MODEL</code> 后，可以得到通俗解释和下一步建议。
            </p>
          </div>
        </div>
      ) : null}

      <section className="conclusion-block">
        <span className="section-index">01</span>
        <div>
          <span className="section-label">先说结论</span>
          <p>{answer.conclusion}</p>
        </div>
      </section>

      {answer.premises.length > 0 ? (
        <section className="answer-section">
          <span className="section-index">02</span>
          <div>
            <h2>还需要确认这些情况</h2>
            <ul className="premise-list">
              {answer.premises.map((premise) => (
                <li key={premise}>{premise}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {answer.analysis.length > 0 ? (
        <section className="answer-section">
          <span className="section-index">03</span>
          <div>
            <h2>法律怎么规定</h2>
            {answer.analysis.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="answer-section basis-section">
        <span className="section-index">04</span>
        <div>
          <div className="section-heading-row">
            <h2>依据原文</h2>
            <button className="text-button" type="button" onClick={onOpenSources}>
              查看全部 {answer.citations.length} 条
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
          {answer.basis.length > 0 ? (
            <div className="basis-list">
              {answer.basis.map((basis) => (
                <button
                  className="basis-row"
                  type="button"
                  key={basis.articleId}
                  onClick={() => onCitation(basis.article)}
                >
                  <span className="basis-source">
                    <strong>{basis.article.displayNumber}</strong>
                    <span>《{basis.article.lawTitle.replace(/^中华人民共和国/, "")}》</span>
                  </span>
                  <span className="basis-point">{basis.point}</span>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-basis">
              {answer.status === "not_configured"
                ? "具体条文已检索完成，可打开依据面板逐条核对。"
                : "当前没有足够依据形成确定结论。"}
            </p>
          )}
        </div>
      </section>

      {answer.followUps.length > 0 ? (
        <section className="answer-section">
          <span className="section-index">05</span>
          <div>
            <h2>接下来可以确认</h2>
            <ul className="follow-up-list">
              {answer.followUps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {answer.cautions.length > 0 ? (
        <section className="cautions-block">
          <div className="cautions-heading">
            <AlertCircle size={18} aria-hidden="true" />
            <h2>还要注意</h2>
          </div>
          {answer.cautions.map((caution) => (
            <p key={caution}>{caution}</p>
          ))}
        </section>
      ) : null}
    </article>
  );
}

function HistoryDrawer({
  open,
  cases,
  activeQuestion,
  onClose,
  onOpenCase,
  onNewQuestion,
}: {
  open: boolean;
  cases: SavedCase[];
  activeQuestion: string;
  onClose: () => void;
  onOpenCase: (item: SavedCase) => void;
  onNewQuestion: () => void;
}) {
  if (!open) return null;

  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" type="button" aria-label="关闭最近提问" onClick={onClose} />
      <aside className="history-drawer">
        <header>
          <div>
            <span>本机记录</span>
            <h2>最近问过</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            title="关闭最近提问"
            aria-label="关闭最近提问"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <button
          className="drawer-new-button"
          type="button"
          onClick={() => {
            onNewQuestion();
            onClose();
          }}
        >
          <Plus size={17} aria-hidden="true" />
          问一个新问题
        </button>
        <div className="drawer-history-list">
          {cases.length === 0 ? (
            <div className="drawer-empty">
              <History size={21} aria-hidden="true" />
              <p>还没有提问记录。问题只保存在当前浏览器。</p>
            </div>
          ) : (
            cases.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`drawer-history-item ${item.question === activeQuestion ? "is-active" : ""}`}
                onClick={() => {
                  onOpenCase(item);
                  onClose();
                }}
              >
                <span>{item.question}</span>
                <small>{formatDate(item.savedAt)}</small>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

export function LegalWorkbench() {
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [answer, setAnswer] = useState<LegalAnswer | null>(null);
  const [activeQuestion, setActiveQuestion] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setSavedCases(readSavedCases());
    fetch("/api/health")
      .then((response) => response.json())
      .then((payload: HealthPayload) => setHealth(payload))
      .catch(() => setHealth(null));
  }, []);

  const runQuestion = async (question: string) => {
    if (question.trim().length < 2 || loading) return;
    setLoading(true);
    setError("");
    setSourceDrawerOpen(false);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const payload = (await response.json()) as LegalAnswer & { error?: string };
      if (!response.ok) throw new Error(payload.error || "请求失败。");

      setAnswer(payload);
      setActiveQuestion(question);
      setSelectedCitation(payload.citations[0] ?? null);
      setHistory((turns) => [
        ...turns.slice(-3),
        { question, conclusion: payload.conclusion },
      ]);
      setQuery("");
      setFollowUp("");

      const saved: SavedCase = {
        id: crypto.randomUUID(),
        question,
        answer: payload,
        savedAt: payload.generatedAt,
      };
      setSavedCases((current) => {
        const next = [saved, ...current].slice(0, 10);
        window.localStorage.setItem("legal-workbench-cases-v1", JSON.stringify(next));
        return next;
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "请求失败，请稍后重试。",
      );
    } finally {
      setLoading(false);
    }
  };

  const startNewQuestion = () => {
    setAnswer(null);
    setActiveQuestion("");
    setSelectedCitation(null);
    setQuery("");
    setFollowUp("");
    setError("");
    setHistory([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectCitation = (citation: Citation) => {
    setSelectedCitation(citation);
    if (window.matchMedia("(max-width: 960px)").matches) {
      setSourceDrawerOpen(true);
    }
  };

  const openSavedCase = (item: SavedCase) => {
    setAnswer(item.answer);
    setActiveQuestion(item.question);
    setSelectedCitation(item.answer.citations[0] ?? null);
    setError("");
    setHistory([{ question: item.question, conclusion: item.answer.conclusion }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const focusQuestion = () => {
    document.getElementById("research-question")?.focus();
  };

  const goToTopics = () => {
    if (answer) {
      startNewQuestion();
      window.setTimeout(() => {
        document.getElementById("topics")?.scrollIntoView({ behavior: "smooth" });
      }, 60);
      return;
    }
    document.getElementById("topics")?.scrollIntoView({ behavior: "smooth" });
  };

  const lookupArticle = () => {
    if (answer) startNewQuestion();
    setQuery("《中华人民共和国民法典》第五百七十七条规定了什么？");
    window.setTimeout(focusQuestion, 60);
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand-button" type="button" onClick={startNewQuestion}>
            <BrandMark />
          </button>

          <nav className="desktop-nav" aria-label="主要导航">
            <button type="button" onClick={startNewQuestion}>
              法律求助
            </button>
            <button type="button" onClick={goToTopics}>
              法律知识
            </button>
            <button type="button" onClick={lookupArticle}>
              查法条
            </button>
          </nav>

          <div className="header-actions">
            <button
              className="header-quiet-button"
              type="button"
              onClick={() => setHistoryOpen(true)}
              title="打开最近提问"
            >
              <History size={17} aria-hidden="true" />
              <span>最近提问</span>
            </button>
            <a className="header-call-button" href="tel:12348" title="拨打 12348">
              <Phone size={17} aria-hidden="true" />
              <span>12348</span>
            </a>
          </div>
        </div>
      </header>

      {answer ? (
        <main className="answer-page">
          <div className="answer-page-inner">
            <div className="answer-topline">
              <button className="back-button" type="button" onClick={startNewQuestion}>
                <ArrowLeft size={17} aria-hidden="true" />
                返回求助首页
              </button>
              <span>
                <Clock3 size={15} aria-hidden="true" />
                本轮第 {history.length} 次提问
              </span>
            </div>

            <header className="answer-masthead">
              <div className="answer-eyebrow">
                <StatusBadge status={answer.status} />
                <span>{answer.retrievalCount} 条相关法条</span>
                <span>{formatDate(answer.generatedAt)}</span>
              </div>
              <h1>{activeQuestion}</h1>
              <p>
                回答先说明结论，再解释法条。涉及复杂事实或诉讼期限时，请向执业律师核实。
              </p>
            </header>

            <div className="answer-layout">
              <AnswerDocument
                answer={answer}
                onCitation={selectCitation}
                onOpenSources={() => setSourceDrawerOpen(true)}
              />
              <div className="desktop-source-column">
                <SourcePanel
                  citations={answer.citations}
                  selected={selectedCitation}
                  onSelect={setSelectedCitation}
                />
              </div>
            </div>

            {error ? (
              <div className="error-note" role="alert">
                <AlertCircle size={17} aria-hidden="true" />
                {error}
              </div>
            ) : null}

            <section className="follow-up-section">
              <div className="follow-up-heading">
                <div>
                  <span>继续补充</span>
                  <h2>还有哪些情况需要说清楚？</h2>
                </div>
                <span>结合最近 {history.length} 轮对话</span>
              </div>
              <QuestionForm
                compact
                value={followUp}
                onChange={setFollowUp}
                onSubmit={() => runQuestion(followUp)}
                loading={loading}
              />
            </section>

            <LegalAidBand />
          </div>

          {answer.citations.length > 0 ? (
            <div className="mobile-source-bar">
              <button type="button" onClick={() => setSourceDrawerOpen(true)}>
                <BookOpen size={17} aria-hidden="true" />
                查看法条依据
                <span>{answer.citations.length}</span>
              </button>
            </div>
          ) : null}
        </main>
      ) : (
        <main className="home-page">
          <section className="service-intro">
            <div className="service-intro-inner">
              <span className="service-kicker">
                <Scale size={16} aria-hidden="true" />
                公共法律信息服务
              </span>
              <h1>
                先说发生了什么，
                <br />
                再告诉你法律怎么规定。
              </h1>
              <p>
                把你遇到的事情说清楚。我们会找出对应的现行法条，解释你有哪些权利，
                以及下一步可以准备什么。
              </p>
            </div>
          </section>

          <section className="ask-section" id="ask">
            <div className="ask-section-inner">
              <QuestionForm
                value={query}
                onChange={setQuery}
                onSubmit={() => runQuestion(query)}
                loading={loading}
              />

              {error ? (
                <div className="error-note" role="alert">
                  <AlertCircle size={17} aria-hidden="true" />
                  {error}
                </div>
              ) : null}

              <div className="quick-questions">
                <span>可以先这样问</span>
                <div>
                  {QUICK_QUESTIONS.map((question) => (
                    <button
                      type="button"
                      key={question}
                      onClick={() => {
                        setQuery(question);
                        runQuestion(question);
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              <div className="service-status">
                <span>
                  <Database size={15} aria-hidden="true" />
                  {health
                    ? `${health.lawCount.toLocaleString("zh-CN")} 部法规 · ${health.articleCount.toLocaleString("zh-CN")} 条条文`
                    : "正在读取法规库"}
                </span>
                <span>
                  <ShieldCheck size={15} aria-hidden="true" />
                  仅检索中国大陆现行有效法规
                </span>
              </div>
            </div>
          </section>

          <section className="topics-section" id="topics">
            <div className="topics-section-inner">
              <div className="section-heading">
                <div>
                  <span>常见求助</span>
                  <h2>从你遇到的事情开始</h2>
                </div>
                <p>选择一个场景，可以直接查看对应的法律问题和条文依据。</p>
              </div>

              <div className="topic-grid">
                {TOPICS.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <button
                      className="topic-item"
                      key={topic.title}
                      type="button"
                      onClick={() => runQuestion(topic.question)}
                    >
                      <span className="topic-icon">
                        <Icon size={21} aria-hidden="true" />
                      </span>
                      <span className="topic-copy">
                        <strong>{topic.title}</strong>
                        <small>{topic.description}</small>
                      </span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <LegalAidBand />

          {savedCases.length > 0 ? (
            <section className="recent-section">
              <div className="recent-section-inner">
                <div className="section-heading compact-heading">
                  <div>
                    <span>在你本机保存</span>
                    <h2>最近问过</h2>
                  </div>
                  <button type="button" onClick={() => setHistoryOpen(true)}>
                    查看全部
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
                <div className="recent-grid">
                  {savedCases.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="recent-item"
                      onClick={() => openSavedCase(item)}
                    >
                      <span>{item.question}</span>
                      <small>{formatDate(item.savedAt)}</small>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </main>
      )}

      <footer className="site-footer">
        <div>
          <BrandMark />
          <p>公开法规文本整理，仅供法律科普和求助参考，不替代执业律师意见。</p>
        </div>
        <div className="footer-links">
          <a href="https://flk.npc.gov.cn/" target="_blank" rel="noreferrer">
            国家法律法规数据库
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a href="tel:12348">公共法律服务 12348</a>
        </div>
      </footer>

      <HistoryDrawer
        open={historyOpen}
        cases={savedCases}
        activeQuestion={activeQuestion}
        onClose={() => setHistoryOpen(false)}
        onOpenCase={openSavedCase}
        onNewQuestion={startNewQuestion}
      />

      {sourceDrawerOpen ? (
        <div className="drawer-layer">
          <button
            className="drawer-scrim"
            type="button"
            aria-label="关闭法条依据"
            onClick={() => setSourceDrawerOpen(false)}
          />
          <SourcePanel
            mobile
            citations={answer?.citations ?? []}
            selected={selectedCitation}
            onSelect={setSelectedCitation}
            onClose={() => setSourceDrawerOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
