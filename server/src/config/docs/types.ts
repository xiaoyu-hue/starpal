/**
 * 说明页长文的数据结构。
 *
 * 为什么不用纯字符串数组：隐私说明与社区准则需要分层——大节标题、小节标题、
 * 段落、清单、提示块。全部压成 paragraphs 会让「禁止事项清单」变成一整段长文字，
 * 手机端几乎不可读。这里只引入四种块，够用且渲染端不会失控。
 *
 * 文案随代码版本化、不入库（与公告同一套规则）：改文案即发版，
 * 保证页面展示的就是当前代码实际行为，不会出现「文档说采集邮箱、代码里根本没有」的漂移。
 */

/** 单个内容块。kind 决定前端用哪种排版元素呈现。 */
export type DocBlock =
  | { kind: 'p'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'note'; text: string }

/** 一个大节：标题 + 内容块。 */
export type DocSection = {
  heading: string
  blocks: DocBlock[]
}

/**
 * 文档元信息。
 * updatedAt / effectiveAt 分开：改了措辞但用户权利义务未变，只动 updatedAt；
 * 实质变更（新增采集项、改变处置方式）才动 effectiveAt，两者不同步是有意为之。
 */
export type DocMeta = {
  title: string
  updatedAt: string
  effectiveAt: string
  /** 开头一句话摘要：让用户不必读完全文就知道这份文档的底线。 */
  summary: string
}
