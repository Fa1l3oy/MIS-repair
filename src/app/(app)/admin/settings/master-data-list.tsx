"use client";

import { Building2, Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { LEN } from "@/lib/limits";
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

  const Icon = kind === "building" ? Building2 : Tag;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">
            ใช้งาน {items.filter((i) => i.isActive).length} จาก {items.length} รายการ
          </p>
        </div>
      </div>

      {feedback && (
        <div className="px-5 pt-4">
          <Alert tone={feedback.ok ? "success" : "error"}>{feedback.text}</Alert>
        </div>
      )}

      <ul className="divide-y divide-zinc-100">
        {items.map((item) =>
          editing === item.id ? (
            <li key={item.id} className="bg-zinc-50/60 px-5 py-3">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => saveMasterItem(kind, { id: item.id, ...draft }), () => setEditing(null));
                }}
              >
                <input
                  className="input min-w-0 flex-1 py-2"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  maxLength={LEN.buildingName[1]}
                  aria-label="ชื่อ"
                  autoFocus
                />
                {withCode && (
                  <input
                    className="input w-24 py-2"
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                    maxLength={LEN.buildingCode[1]}
                    placeholder="รหัส"
                    aria-label="รหัส"
                  />
                )}
                <button type="submit" className="btn-primary size-10 px-0" disabled={pending} aria-label="บันทึก">
                  <Check className="size-4" />
                </button>
                <button type="button" className="btn-icon" onClick={() => setEditing(null)} aria-label="ยกเลิกการแก้ไข">
                  <X className="size-4" />
                </button>
              </form>
            </li>
          ) : (
            <li key={item.id} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-zinc-50/60">
              <div className={`min-w-0 flex-1 ${item.isActive ? "" : "opacity-50"}`}>
                <p className="flex items-center gap-2 truncate text-sm font-medium text-zinc-900">
                  {item.name}
                  {withCode && item.code && <span className="chip">{item.code}</span>}
                </p>
                <p className="text-xs text-zinc-400">
                  {item.usage > 0 ? `ใช้ใน ${item.usage} ใบแจ้งซ่อม` : "ยังไม่ถูกใช้งาน"}
                  {!item.isActive && " · ปิดการใช้งาน"}
                </p>
              </div>
              <button
                type="button"
                className="btn-icon size-8"
                onClick={() => {
                  setEditing(item.id);
                  setDraft({ name: item.name, code: item.code ?? "" });
                }}
                aria-label={`แก้ไข ${item.name}`}
                title="แก้ไข"
              >
                <Pencil className="size-3.5" />
              </button>
              {item.usage === 0 && (
                <button
                  type="button"
                  className="btn-icon size-8 hover:bg-rose-50 hover:text-rose-600"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`ลบ "${item.name}" ?`)) run(() => deleteMasterItem(kind, item.id));
                  }}
                  aria-label={`ลบ ${item.name}`}
                  title="ลบ"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
              <Switch
                checked={item.isActive}
                disabled={pending}
                onChange={(checked) => run(() => setMasterItemActive(kind, item.id, checked))}
                label={`${item.isActive ? "ปิด" : "เปิด"}การใช้งาน ${item.name}`}
              />
            </li>
          ),
        )}
      </ul>

      <form
        className="flex flex-wrap gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveMasterItem(kind, newItem), () => setNewItem({ name: "", code: "" }));
        }}
      >
        <input
          className="input min-w-0 flex-1"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          maxLength={LEN.buildingName[1]}
          placeholder={`เพิ่ม${title}ใหม่`}
          aria-label={`ชื่อ${title}ใหม่`}
        />
        {withCode && (
          <input
            className="input w-24"
            value={newItem.code}
            onChange={(e) => setNewItem({ ...newItem, code: e.target.value.toUpperCase() })}
            maxLength={LEN.buildingCode[1]}
            placeholder="รหัส"
            aria-label="รหัส"
          />
        )}
        <button type="submit" className="btn-primary h-auto min-h-10" disabled={pending || !newItem.name.trim()}>
          <Plus className="size-4" strokeWidth={2.25} />
          เพิ่ม
        </button>
      </form>
    </section>
  );
}
