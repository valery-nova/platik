"use client";

import { useEffect, useRef } from "react";
import { translate } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
type Attr = (typeof ATTRS)[number];

type Originals = {
  text: WeakMap<Text, string>;
  attrs: WeakMap<Element, Partial<Record<Attr, string>>>;
};

function cleanText(value: string): { lead: string; core: string; trail: string } {
  const lead = value.match(/^\s*/)![0];
  const trail = value.match(/\s*$/)![0];
  return { lead, core: value.trim(), trail };
}

function applyToTextNode(node: Text, originals: Originals) {
  const raw = node.nodeValue ?? "";
  if (!raw.trim()) return;
  const { lead, core, trail } = cleanText(raw);
  if (!core || core.length > 500) return;
  const en = translate("en", core);
  if (en === core) return;
  originals.text.set(node, raw);
  node.nodeValue = `${lead}${en}${trail}`;
}

function applyToElement(el: Element, originals: Originals) {
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value?.trim()) continue;
    const { core } = cleanText(value);
    const en = translate("en", core);
    if (en === core) continue;
    const map = originals.attrs.get(el) ?? {};
    map[attr] = value;
    originals.attrs.set(el, map);
    el.setAttribute(attr, en);
  }
}

function translateDom(root: ParentNode, originals: Originals) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    applyToTextNode(node as Text, originals);
    node = walker.nextNode();
  }
  root.querySelectorAll("*").forEach((el) => applyToElement(el, originals));
}

function restoreDom(root: ParentNode, originals: Originals) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    const original = originals.text.get(text);
    if (original !== undefined) {
      text.nodeValue = original;
      originals.text.delete(text);
    }
    node = walker.nextNode();
  }
  root.querySelectorAll("*").forEach((el) => {
    const map = originals.attrs.get(el);
    if (!map) return;
    for (const attr of ATTRS) {
      const original = map[attr];
      if (original !== undefined) {
        el.setAttribute(attr, original);
        delete map[attr];
      }
    }
    if (Object.keys(map).length === 0) originals.attrs.delete(el);
  });
}

export function I18nTranslator() {
  const { lang } = usePreferences();
  const originals = useRef<Originals>({
    text: new WeakMap(),
    attrs: new WeakMap(),
  });

  useEffect(() => {
    if (lang === "es") {
      restoreDom(document.body, originals.current);
      return;
    }
    let scheduled = false;
    const run = () => {
      scheduled = false;
      translateDom(document.body, originals.current);
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
