import { useEffect, useMemo, useState } from "react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import {
  createAllocation,
  deleteAllocation,
  listAllocations,
  updateAllocation,
  type Allocation,
} from "@/lib/allocation.functions";

export const Route = createFileRoute("/_authenticated/master/nomor-surat")({
  component: Page,
});

type FormState = {
  id_allocation: number | null;
  tahun: number;
  range_start: number;
  range_end: number;
  status: "Active" | "Inactive";
};

const currentYear = new Date().getFullYear();

function Page() {
  const { isAdmin, isLoading } = useRequireAdmin();
  const qc = useQueryClient();
  const list = useServerFn(listAllocations);
  const add = useServerFn(createAllocation);
  const upd = useServerFn(updateAllocation);
  const del = useServerFn(deleteAllocation);

  const [yearFilter, setYearFilter] = useState<"all" | number>(currentYear);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Allocation | null>(null);
  const [form, setForm] = useState<FormState>({
    id_allocation: null,
    tahun: currentYear,
    range_start: 1,
    range_end: 100,
    status: "Active",
  });
  const [submitting, setSubmitting] = useState(false);

  const q = useQuery({
    queryKey: ["nomor_surat_allocation"],
    queryFn: () => list({ data: {} }),
    enabled: isAdmin,
  });

  const allRows = q.data ?? [];
  const years = useMemo(() => {
    const s = new Set<number>([currentYear, ...allRows.map((r) => r.tahun)]);
    return Array.from(s).sort((a, b) => b - a);
  }, [allRows]);

  const rows = useMemo(
    () =>
      yearFilter === "all"
        ? allRows
        : allRows.filter((r) => r.tahun === yearFilter),
    [allRows, yearFilter],
  );

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [yearFilter]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const currentYearActive = allRows.filter(
    (r) => r.tahun === currentYear && r.status === "Active",
  );
  const currentYearSisa = currentYearActive.reduce(
    (acc, r) => acc + Math.max(0, r.range_end - r.last_used_number),
    0,
  );

  const openCreate = () => {
    setForm({
      id_allocation: null,
      tahun: currentYear,
      range_start: 1,
      range_end: 100,
      status: "Active",
    });
    setOpen(true);
  };

  const openEdit = (r: Allocation) => {
    setForm({
      id_allocation: r.id_allocation,
      tahun: r.tahun,
      range_start: r.range_start,
      range_end: r.range_end,
      status: r.status,
    });
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      if (form.id_allocation == null) {
        await add({
          data: {
            tahun: form.tahun,
            range_start: form.range_start,
            range_end: form.range_end,
          },
        });
        toast.success("Jatah ditambahkan");
      } else {
        await upd({
          data: {
            id_allocation: form.id_allocation,
            tahun: form.tahun,
            range_start: form.range_start,
            range_end: form.range_end,
            status: form.status,
          },
        });
        toast.success("Jatah diperbarui");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["nomor_surat_allocation"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    try {
      await del({ data: { id_allocation: confirmDel.id_allocation } });
      toast.success("Jatah dihapus");
      qc.invalidateQueries({ queryKey: ["nomor_surat_allocation"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menghapus");
    } finally {
      setConfirmDel(null);
    }
  };

  if (isLoading || !isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">
            Setting Nomor Surat
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Atur jatah (range) nomor surat per tahun. Saat membuat SPT, nomor
            otomatis diambil dari jatah aktif tahun berjalan.
          </p>
        </div>
        <Button onClick={openCreate}>
          <span className="material-symbols-outlined mr-2 text-base">add</span>
          Tambah Jatah
        </Button>
      </div>

      {currentYearActive.length === 0 || currentYearSisa === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
          Belum ada jatah nomor surat aktif dengan sisa kuota untuk tahun{" "}
          <strong>{currentYear}</strong>. Tambahkan jatah agar Admin dapat
          membuat ST.
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Label className="text-sm">Filter tahun:</Label>
        <Select
          value={String(yearFilter)}
          onValueChange={(v) =>
            setYearFilter(v === "all" ? "all" : Number(v))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tahun</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tahun</TableHead>
              <TableHead>Range</TableHead>
              <TableHead>Terpakai</TableHead>
              <TableHead>Sisa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-on-surface-variant">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-on-surface-variant">
                  Belum ada jatah.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((r) => {
                const total = r.range_end - r.range_start + 1;
                const used = Math.max(0, r.last_used_number - r.range_start + 1);
                const sisa = Math.max(0, r.range_end - r.last_used_number);
                const canDelete = r.last_used_number < r.range_start;
                return (
                  <TableRow key={r.id_allocation}>
                    <TableCell>{r.tahun}</TableCell>
                    <TableCell>
                      {r.range_start} – {r.range_end}
                    </TableCell>
                    <TableCell>
                      {used} / {total}
                    </TableCell>
                    <TableCell>{sisa}</TableCell>
                    <TableCell>
                      <span
                        className={
                          r.status === "Active"
                            ? "inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs"
                            : "inline-flex items-center rounded-full bg-gray-200 text-gray-700 px-2 py-0.5 text-xs"
                        }
                      >
                        {r.status === "Active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(r)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canDelete}
                        title={
                          canDelete
                            ? "Hapus jatah"
                            : "Jatah sudah dipakai, tidak dapat dihapus"
                        }
                        onClick={() => setConfirmDel(r)}
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          total={rows.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id_allocation == null
                ? "Tambah Jatah Nomor Surat"
                : "Edit Jatah Nomor Surat"}
            </DialogTitle>
            <DialogDescription>
              Range nomor (start–end) yang dialokasikan ke web app pada tahun
              tersebut.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tahun</Label>
              <Input
                type="number"
                value={form.tahun}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tahun: Number(e.target.value) }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Range awal</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.range_start}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      range_start: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <Label>Range akhir</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.range_end}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      range_end: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            {form.id_allocation != null ? (
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as "Active" | "Inactive",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Aktif</SelectItem>
                    <SelectItem value="Inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jatah ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
