import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, X, Loader2, ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { DbCategory, DbFood } from "@/types/supabase";

export const Route = createFileRoute("/admin/menu")({
  component: AdminMenu,
});

// ── helpers ────────────────────────────────────────────────
function formatPrice(n: number) {
  return `KSh ${n.toLocaleString()}`;
}

const EMPTY_FOOD = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  prep_time: "",
  is_popular: false,
  is_available: true,
  tags: "",
};

const EMPTY_CATEGORY = { name: "", emoji: "" };

// ── component ──────────────────────────────────────────────
function AdminMenu() {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [foods, setFoods] = useState<DbFood[]>([]);
  const [loading, setLoading] = useState(true);

  // food modal
  const [foodModal, setFoodModal] = useState<"add" | "edit" | null>(null);
  const [editingFood, setEditingFood] = useState<DbFood | null>(null);
  const [foodForm, setFoodForm] = useState(EMPTY_FOOD);
  const [foodImageFile, setFoodImageFile] = useState<File | null>(null);
  const [foodImagePreview, setFoodImagePreview] = useState<string | null>(null);
  const [savingFood, setSavingFood] = useState(false);
  const foodImageRef = useRef<HTMLInputElement>(null);

  // category modal
  const [catModal, setCatModal] = useState<"add" | null>(null);
  const [catForm, setCatForm] = useState(EMPTY_CATEGORY);
  const [savingCat, setSavingCat] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── fetch ────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    const [{ data: cats }, { data: fds }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("foods").select("*").order("category_id").order("name"),
    ]);
    setCategories(cats ?? []);
    setFoods(fds ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── image upload ─────────────────────────────────────────
  async function uploadFoodImage(file: File, foodId: string): Promise<string> {
    const ext = file.name.split(".").pop();
    const filename = `${foodId}.${ext}`;
    const { error } = await supabase.storage
      .from("food-images")
      .upload(filename, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("food-images").getPublicUrl(filename);
    return data.publicUrl;
  }

  // ── save food ────────────────────────────────────────────
  async function handleSaveFood() {
    if (!foodForm.name || !foodForm.price || !foodForm.category_id) {
      setError("Name, price and category are required.");
      return;
    }
    setSavingFood(true);
    setError(null);
    try {
      const isEdit = foodModal === "edit" && editingFood;
      const foodId = isEdit ? editingFood!.id : `f_${Date.now()}`;

      let image_url = isEdit ? editingFood!.image_url : null;
      if (foodImageFile) {
        image_url = await uploadFoodImage(foodImageFile, foodId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        id: foodId,
        name: foodForm.name,
        description: foodForm.description,
        price: parseFloat(foodForm.price),
        category_id: foodForm.category_id,
        prep_time: foodForm.prep_time || null,
        is_popular: foodForm.is_popular,
        is_available: foodForm.is_available,
        tags: foodForm.tags ? foodForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        image_url,
      };

      if (isEdit) {
        const { error } = await (supabase.from("foods") as any).update(payload).eq("id", editingFood!.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("foods") as any).insert(payload);
        if (error) throw error;
      }

      closeFoodModal();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingFood(false);
    }
  }

  // ── delete food ──────────────────────────────────────────
  async function handleDeleteFood() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("foods").delete().eq("id", deleteTarget);
    if (!error) {
      setDeleteTarget(null);
      await load();
    }
    setDeleting(false);
  }

  // ── save category ────────────────────────────────────────
  async function handleSaveCategory() {
    if (!catForm.name || !catForm.emoji) {
      setError("Name and emoji are required.");
      return;
    }
    setSavingCat(true);
    setError(null);
    try {
      const id = catForm.name.toLowerCase().replace(/\s+/g, "_");
      const sort_order = categories.length + 1;
      const { error } = await supabase.from("categories").insert({ id, ...catForm, sort_order });
      if (error) throw error;
      setCatModal(null);
      setCatForm(EMPTY_CATEGORY);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingCat(false);
    }
  }

  // ── modal helpers ────────────────────────────────────────
  function openAddFood() {
    setFoodForm(EMPTY_FOOD);
    setFoodImageFile(null);
    setFoodImagePreview(null);
    setEditingFood(null);
    setError(null);
    setFoodModal("add");
  }

  function openEditFood(f: DbFood) {
    setFoodForm({
      name: f.name,
      description: f.description,
      price: String(f.price),
      category_id: f.category_id,
      prep_time: f.prep_time ?? "",
      is_popular: f.is_popular,
      is_available: f.is_available,
      tags: f.tags?.join(", ") ?? "",
    });
    setFoodImageFile(null);
    setFoodImagePreview(f.image_url);
    setEditingFood(f);
    setError(null);
    setFoodModal("edit");
  }

  function closeFoodModal() {
    setFoodModal(null);
    setEditingFood(null);
    setFoodImageFile(null);
    setFoodImagePreview(null);
    setError(null);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoodImageFile(file);
    setFoodImagePreview(URL.createObjectURL(file));
  }

  // ── render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Menu</h1>
        <button
          onClick={openAddFood}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {/* Categories */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Categories</h2>
        {loading ? (
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-card" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c.id} className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-soft">
                <span>{c.emoji}</span> {c.name}
              </span>
            ))}
            <button
              onClick={() => { setCatForm(EMPTY_CATEGORY); setError(null); setCatModal("add"); }}
              className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-border bg-transparent px-4 py-2 text-sm font-semibold text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> New category
            </button>
          </div>
        )}
      </div>

      {/* Foods list */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Items <span className="ml-1 text-xs font-normal">({foods.length})</span>
        </h2>
        {loading ? (
          <div className="grid gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {foods.map((f) => (
              <div key={f.id} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft">
                {/* Image or emoji fallback */}
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-2xl">
                  {f.image_url
                    ? <img src={f.image_url} alt={f.name} className="h-full w-full object-cover" />
                    : <span>🍽️</span>
                  }
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-1 font-semibold">{f.name}</p>
                    {!f.is_available && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                        Unavailable
                      </span>
                    )}
                    {f.is_popular && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{f.description}</p>
                </div>

                <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground md:inline">
                  {categories.find((c) => c.id === f.category_id)?.name}
                </span>
                <span className="font-bold">{formatPrice(Number(f.price))}</span>

                <div className="flex gap-1">
                  <button
                    onClick={() => openEditFood(f)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground transition-smooth hover:bg-primary hover:text-primary-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(f.id)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground transition-smooth hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Food modal (add / edit) ── */}
      {foodModal && (
        <Modal title={foodModal === "add" ? "Add menu item" : "Edit item"} onClose={closeFoodModal}>
          <div className="space-y-4">
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

            {/* Image picker */}
            <div
              onClick={() => foodImageRef.current?.click()}
              className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary hover:border-primary"
            >
              {foodImagePreview
                ? <img src={foodImagePreview} alt="preview" className="h-full w-full object-cover" />
                : <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-xs font-semibold">Click to upload image</span>
                  </div>
              }
              <input ref={foodImageRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *" className="col-span-2">
                <input value={foodForm.name} onChange={(e) => setFoodForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Truffle Fries" />
              </Field>
              <Field label="Price (KSh) *">
                <input type="number" min="0" step="0.01" value={foodForm.price} onChange={(e) => setFoodForm((p) => ({ ...p, price: e.target.value }))} placeholder="0.00" />
              </Field>
              <Field label="Prep time">
                <input value={foodForm.prep_time} onChange={(e) => setFoodForm((p) => ({ ...p, prep_time: e.target.value }))} placeholder="e.g. 15 min" />
              </Field>
              <Field label="Category *" className="col-span-2">
                <select value={foodForm.category_id} onChange={(e) => setFoodForm((p) => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Description" className="col-span-2">
                <textarea rows={2} value={foodForm.description} onChange={(e) => setFoodForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short description…" />
              </Field>
              <Field label="Tags (comma separated)" className="col-span-2">
                <input value={foodForm.tags} onChange={(e) => setFoodForm((p) => ({ ...p, tags: e.target.value }))} placeholder="e.g. Spicy, Bestseller" />
              </Field>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={foodForm.is_popular} onChange={(e) => setFoodForm((p) => ({ ...p, is_popular: e.target.checked }))} className="h-4 w-4 accent-primary" />
                Mark as popular
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={foodForm.is_available} onChange={(e) => setFoodForm((p) => ({ ...p, is_available: e.target.checked }))} className="h-4 w-4 accent-primary" />
                Available
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeFoodModal} className="rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary">
                Cancel
              </button>
              <button
                onClick={handleSaveFood}
                disabled={savingFood}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {savingFood && <Loader2 className="h-4 w-4 animate-spin" />}
                {foodModal === "add" ? "Add item" : "Save changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Category modal ── */}
      {catModal && (
        <Modal title="New category" onClose={() => setCatModal(null)}>
          <div className="space-y-4">
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Field label="Emoji *">
              <input value={catForm.emoji} onChange={(e) => setCatForm((p) => ({ ...p, emoji: e.target.value }))} placeholder="🍕" maxLength={4} />
            </Field>
            <Field label="Name *">
              <input value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Wraps" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCatModal(null)} className="rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary">
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={savingCat}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {savingCat && <Loader2 className="h-4 w-4 animate-spin" />}
                Add category
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <Modal title="Delete item?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-muted-foreground mb-6">
            This will permanently remove the item from the menu. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary">
              Cancel
            </button>
            <button
              onClick={handleDeleteFood}
              disabled={deleting}
              className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-60"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-border [&>input]:bg-secondary [&>input]:px-3 [&>input]:py-2 [&>input]:text-sm [&>input]:outline-none [&>input]:focus:border-primary [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-border [&>select]:bg-secondary [&>select]:px-3 [&>select]:py-2 [&>select]:text-sm [&>select]:outline-none [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-border [&>textarea]:bg-secondary [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:text-sm [&>textarea]:outline-none [&>textarea]:resize-none [&>textarea]:focus:border-primary">
        {children}
      </div>
    </div>
  );
}