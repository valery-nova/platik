"use client";

import { useEffect } from "react";
import { translate } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;

function cleanText(value: string): { lead: string; core: string; trail: string } {
  const lead = value.match(/^\s*/)![0];
  const trail = value.match(/\s*$/)![0];
  return { lead, core: value.trim(), trail };
}

function applyToTextNode(node: Text) {
  const raw = node.nodeValue ?? "";
  if (!raw.trim()) return;
  const { lead, core, trail } = cleanText(raw);
  if (!core || core.length > 500) return;
  const en = translate("en", core);
  if (en !== core) node.nodeValue = `${lead}${en}${trail}`;
}

function applyToElement(el: Element) {
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value?.trim()) continue;
    const { core } = cleanText(value);
    const en = translate("en", core);
    if (en !== core) el.setAttribute(attr, en);
  }
}

function translateDom(root: ParentNode = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    applyToTextNode(node as Text);
    node = walker.nextNode();
  }
  root.querySelectorAll("*").forEach(applyToElement);
}

export function I18nTranslator() {
  const { lang } = usePreferences();

  useEffect(() => {
    if (lang !== "en") return;
    let scheduled = false;
    const run = () => {
      scheduled = false;
      translateDom();
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.setTimeout(run, 0);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });
    return () => observer.disconnect();
  }, [lang]);

  return null;
}
