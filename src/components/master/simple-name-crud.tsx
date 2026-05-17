import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from "sonner";

export type NameRow = { id: number; nama: string };

export function SimpleNameCrud(props: {
  title: string;
  subtitle: string;
  labelNama: string;
  rows: NameRow[];
  loading: boolean;
  onAdd: (nama: string) => Promise<void>;
  onUpdate: (id: number, nama: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const { title, subtitle, labelNama, rows, loading, onAdd, onUpdate, onDelete } =
    props;
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<
    { mode: "add" } | { mode: "edit"; row: NameRow } | null
  >(null);
  const [confirmDel, setConfirmDel] = useState<NameRow | null>(null);
  const [nama, setNama] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.nama.toLowerCase().includes(s));
  }, [rows, search]);

  const openAdd = () => {
    setNama("");
    setDialog({ mode: "add" });
  };
  const openEdit = (r: NameRow) => {
    setNama(r.nama);
    setDialog({ mode: "edit", row: r });
  };
  const close = () => {
    setDialog(null);
    setNama("");
  };

  const submit = async () => {
    if (!dialog) return;
    const v = nama.trim();
    if (v.length < 2) {
      toast.error("Nama minimal 2 karakter");
      return;
    }
    setBusy(true);
    try {
      if (dialog.mode === "add") await onAdd(v);
      else await onUpdate(dialog.row.id, v);
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    setBusy(true);
    try {
      await onDelete(confirmDel.id);
      setConfirmDel(null);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menghapus");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">{title}</h2>
          <p className="text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        <Button onClick={openAdd}>
          <span className="material-symbols-outlined !text-[18px] mr-1">add</span>
          Tambah Baru
        </Button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
        <div className="p-4 border-b border-outline-variant flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-on-surface-variant">
              search
            </span>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Cari ${labelNama.toLowerCase()}…`}
              className="pl-9"
            />
          </div>
          <div className="ml-auto text-sm text-on-surface-variant">
            {filtered.length} data
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>{labelNama}</TableHead>
              <TableHead className="w-40 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-on-surface-variant">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-on-surface-variant">
                  Belum ada data
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-on-surface-variant">{r.id}</TableCell>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(r)}
                      className="text-primary"
                    >
                      <span className="material-symbols-outlined !text-[18px] mr-1">edit</span>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDel(r)}
                      className="text-destructive"
                    >
                      <span className="material-symbols-outlined !text-[18px] mr-1">delete</span>
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? `Edit ${title}` : `Tambah ${title}`}
            </DialogTitle>
            <DialogDescription>
              Isi {labelNama.toLowerCase()} lalu simpan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="nama">{labelNama}</Label>
            <Input
              id="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus <b>{confirmDel?.nama}</b>. Tindakan ini tidak
              dapat dibatalkan dan dapat gagal jika data masih dipakai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Menghapus…" : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
