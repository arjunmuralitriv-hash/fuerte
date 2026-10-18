/* eslint-disable @typescript-eslint/no-explicit-any -- mdast nodes are walked structurally here. */

const FAQ_HEADING = /^(frequently asked questions|faqs?|الأسئلة الشائعة|أسئلة شائعة)/i;

const textOf = (node: any): string =>
  node.type === "text" || node.type === "inlineCode" ? node.value : (node.children ?? []).map(textOf).join("");

/**
 * Wraps each "### Question" + answer inside the FAQ section in <details><summary>, so answers stay in the
 * HTML for crawlers and answer engines but collapse for readers, with no JavaScript.
 */
export function remarkFaq() {
  return (tree: any) => {
    const nodes: any[] = tree.children;
    const start = nodes.findIndex((n) => n.type === "heading" && n.depth === 2 && FAQ_HEADING.test(textOf(n)));
    if (start < 0) return;
    let end = start + 1;
    while (end < nodes.length && !(nodes[end].type === "heading" && nodes[end].depth <= 2)) end++;

    const grouped: any[] = [];
    for (const node of nodes.slice(start + 1, end)) {
      if (node.type === "heading" && node.depth === 3) {
        grouped.push({
          type: "faqItem",
          data: { hName: "details" },
          children: [{ type: "faqSummary", data: { hName: "summary" }, children: node.children }],
        });
      } else if (grouped.length) {
        grouped[grouped.length - 1].children.push(node);
      } else {
        grouped.push(node);
      }
    }
    const list = { type: "faqList", data: { hName: "div", hProperties: { "data-faq": "" } }, children: grouped };
    nodes.splice(start + 1, end - start - 1, list);
  };
}
