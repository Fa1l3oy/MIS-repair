"use client";

import { useState, useTransition } from "react";
import { deleteMasterItem, saveMasterItem, setMasterItemActive, type MasterKind } from "./actions";

export type MasterItem = { id: string; name: string; code?: string | null; isActive: boolean; usage: number };

type Result = { ok: boolean; error?: string; message?: string };

export function MasterDataList({
  kind,
  title,
  items,
  withCode = false,
}: {
  kind: MasterKind;
  title: string;
  items: MasterItem[];
  withCode?: boolean;
}) {
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", code: "" });
  const [newItem, setNewItem] = useState({ name: "", code: "" });
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<Result>, onOk?: () => void) {
    startTransition(async () => {
      const res = await fn();
      setFeedback(res.ok ? (res.message ? { ok: true, text: res.message } : undefined) : { ok: false, text: res.error ?? "" });
      if (res.ok) onOk?.();
    });
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-slate-500">
          ใช้งาน {items.filter((i) => i.isActive).length} / {items.length}
        </span>
      </div>

      {feedback && (
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
        >
          {feedback.text}
        </p>
      )}

      <ul className="divide-y divide-slate-100">
        {items.map((item) =>
          editing === item.id ? (
            <li key={item.id} className="py-2">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => saveMasterItem(kind, { id: item.id, ...draft }), () => setEditing(null));
                }}
              >
                <input
                  className="input min-w-0 flex-1 py-1.5"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  aria-label="ชื่อ"
                  autoFocus
                />
                {withCode && (
                  <input
                    className="input w-24 py-1.5"
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                    placeholder="รหัส"
                    aria-label="รหัส"
                  />
                )}
                <button type="submit" className="btn-primary px-3 py-1.5" disabled={pending}>
                  บันทึก
                </button>
                <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setEditing(null)}>
                  ยกเลิก
                </button>
              </form>
            </li>
          ) : (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <div className={`min-w-0 flex-1 ${item.isActive ? "" : "opacity-50"}`}>
                <p className="truncate text-sm font-medium text-slate-800">
                  {item.name}
                  {withCode && item.code && <span className="ml-2 font-mono text-xs text-slate-400">{item.code}</span>}
                </p>
                <p className="text-xs text-slate-400">
                  {item.usage > 0 ? `ใช้ใน ${item.usage} ใบแจ้งซ่อม` : "ยังไม่ถูกใช้งาน"}
                  {!item.isActive && " · ปิดการใช้งาน"}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={item.isActive}
                  disabled={pending}
                  onChange={(e) => run(() => setMasterItemActive(kind, item.id, e.target.checked))}
                />
                เปิดใช้
              </label>
              <button
                type="button"
                className="text-xs text-indigo-600 hover:underline"
                onClick={() => {
                  setEditing(item.id);
                  setDraft({ name: item.name, code: item.code ?? "" });
                }}
              >
                แก้ไข
              </button>
              {item.usage === 0 && (
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`ลบ "${item.name}" ?`)) run(() => deleteMasterItem(kind, item.id));
                  }}
                >
                  ลบ
                </button>
              )}
            </li>
          ),
        )}
      </ul>

      <form
        className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveMasterItem(kind, newItem), () => setNewItem({ name: "", code: "" }));
        }}
      >
        <input
          className="input min-w-0 flex-1"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          placeholder={`ชื่อ${title}ใหม่`}
          aria-label={`ชื่อ${title}ใหม่`}
        />
        {withCode && (
          <input
            className="input w-24"
            value={newItem.code}
            onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
            placeholder="รหัส"
            aria-label="รหัส"
          />
        )}
        <button type="submit" className="btn-primary" disabled={pending || !newItem.name.trim()}>
          + เพิ่ม
        </button>
      </form>
    </section>
  );
}
