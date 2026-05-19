import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { listAllUsers, listGolongan, updateUser } from "@/lib/master.functions";
import {
  createUser,
  deleteUser,
  resetUserPassword,
} from "@/lib/master-admin.functions";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/master/user")({
  component: Page,
});

type UserRow = {
  id_user: string;
  nip: string | null;
  username: string | null;
  nama: string;
  email_internal: string | null;
  jabatan: string | null;
  unit: string | null;
  status_kepegawaian: "ASN" | "NON ASN";
  role_user: "Admin" | "Petugas" | null;
  is_kepala_uptd: boolean | null;
  id_golongan: number | null;
};

type FormState = {
  nip: string;
  username: string;
  nama: string;
  password: string;
  status_kepegawaian: "ASN" | "NON ASN";
  role_user: "Admin" | "Petugas";
  is_kepala_uptd: boolean;
  id_golongan: number | null;
  jabatan: string;
  unit: string;
};

const blankForm: FormState = {
  nip: "",
  username: "",
  nama: "",
  password: "",
  status_kepegawaian: "ASN",
  role_user: "Petugas",
  is_kepala_uptd: false,
  id_golongan: null,
  jabatan: "",
  unit: "",
};

function Page() {
  const { isAdmin, isLoading } = useRequireAdmin();
  const qc = useQueryClient();
  const fnList = useServerFn(listAllUsers);
  const fnGol = useServerFn(listGolongan);
  const fnCreate = useServerFn(createUser);
  const fnUpdate = useServerFn(updateUser);
  const fnDelete = useServerFn(deleteUser);
  const fnReset = useServerFn(resetUserPassword);

  const users = useQuery({
    queryKey: ["master_user_all"],
    queryFn: () => fnList(),
    enabled: isAdmin,
  });
  const golongan = useQuery({
    queryKey: ["master_golongan"],
    queryFn: () => fnGol(),
    enabled: isAdmin,
  });

  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<
    { mode: "add" } | { mode: "edit"; row: UserRow } | null
  >(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<UserRow | null>(null);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [resetPwd, setResetPwd] = useState("");

  const rows = (users.data ?? []) as UserRow[];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.nama.toLowerCase().includes(s) ||
        (r.nip ?? "").toLowerCase().includes(s) ||
        (r.username ?? "").toLowerCase().includes(s) ||
        (r.jabatan ?? "").toLowerCase().includes(s),
    );
  }, [rows, search]);

  const golMap = useMemo(() => {
    const m = new Map<number, string>();
    (golongan.data ?? []).forEach((g) => m.set(g.id_golongan, g.nama_golongan));
    return m;
  }, [golongan.data]);

  if (isLoading || !isAdmin) return null;

  const openAdd = () => {
    setForm(blankForm);
    setDialog({ mode: "add" });
  };

  const openEdit = (row: UserRow) => {
    setForm({
      nip: row.nip ?? "",
      username: row.username ?? "",
      nama: row.nama,
      password: "",
      status_kepegawaian: row.status_kepegawaian,
      role_user: (row.role_user ?? "Petugas") as "Admin" | "Petugas",
      is_kepala_uptd: !!row.is_kepala_uptd,
      id_golongan: row.id_golongan,
      jabatan: row.jabatan ?? "",
      unit: row.unit ?? "",
    });
    setDialog({ mode: "edit", row });
  };

  const close = () => {
    setDialog(null);
    setForm(blankForm);
  };

  const submit = async () => {
    if (!dialog) return;
    if (dialog.mode === "add" && form.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setBusy(true);
    try {
      if (dialog.mode === "add") {
        const isAsn = form.status_kepegawaian === "ASN";
        await fnCreate({
          data: {
            nip: isAsn ? form.nip.trim() : null,
            username: form.username.trim() || null,
            nama: form.nama.trim(),
            password: form.password,
            status_kepegawaian: form.status_kepegawaian,
            role_user: form.role_user,
            is_kepala_uptd: form.is_kepala_uptd,
            id_golongan: isAsn ? form.id_golongan : null,
            jabatan: form.jabatan.trim() || null,
            unit: form.unit.trim() || null,
          },
        });
        toast.success("User ditambahkan");
      } else {
        await fnUpdate({
          data: {
            id_user: dialog.row.id_user,
            nama: form.nama.trim(),
            status_kepegawaian: form.status_kepegawaian,
            role_user: form.role_user,
            is_kepala_uptd: form.is_kepala_uptd,
            id_golongan: form.id_golongan,
            jabatan: form.jabatan.trim() || null,
            unit: form.unit.trim() || null,
          },
        });
        toast.success("User diperbarui");
      }
      qc.invalidateQueries({ queryKey: ["master_user_all"] });
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
      await fnDelete({ data: { id_user: confirmDel.id_user } });
      toast.success("User dihapus");
      qc.invalidateQueries({ queryKey: ["master_user_all"] });
      setConfirmDel(null);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menghapus");
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    if (!resetFor) return;
    if (resetPwd.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setBusy(true);
    try {
      await fnReset({ data: { id_user: resetFor.id_user, password: resetPwd } });
      toast.success("Password berhasil direset");
      setResetFor(null);
      setResetPwd("");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal reset password");
    } finally {
      setBusy(false);
    }
  };

  const isEdit = dialog?.mode === "edit";

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">User Pegawai</h2>
          <p className="text-sm text-on-surface-variant">
            Kelola akun pegawai (Admin / Petugas) beserta atribut kepegawaiannya.
          </p>
        </div>
        <Button onClick={openAdd}>
          <span className="material-symbols-outlined !text-[18px] mr-1">add</span>
          Tambah User
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
              placeholder="Cari NIP, nama, jabatan…"
              className="pl-9"
            />
          </div>
          <div className="ml-auto text-sm text-on-surface-variant">
            {filtered.length} user
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIP</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jabatan / Unit</TableHead>
                <TableHead>Golongan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-on-surface-variant">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-on-surface-variant">
                    Belum ada user
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id_user}>
                    <TableCell className="font-mono text-xs">{r.nip}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.nama}</div>
                      {r.is_kepala_uptd && (
                        <div className="text-[10px] font-semibold text-secondary mt-0.5">
                          KEPALA UPTD
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{r.jabatan ?? "—"}</div>
                      <div className="text-xs text-on-surface-variant">{r.unit ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.id_golongan ? golMap.get(r.id_golongan) ?? "—" : "—"}
                    </TableCell>
                    <TableCell>
                      <Pill kind={r.status_kepegawaian === "ASN" ? "asn" : "non"}>
                        {r.status_kepegawaian}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      <Pill kind={r.role_user === "Admin" ? "admin" : "petugas"}>
                        {r.role_user ?? "Petugas"}
                      </Pill>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="text-primary" onClick={() => openEdit(r)}>
                        <span className="material-symbols-outlined !text-[18px]">edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-on-surface-variant"
                        onClick={() => {
                          setResetFor(r);
                          setResetPwd("");
                        }}
                        title="Reset password"
                      >
                        <span className="material-symbols-outlined !text-[18px]">key</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setConfirmDel(r)}
                      >
                        <span className="material-symbols-outlined !text-[18px]">delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit User" : "Tambah User"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "NIP & password tidak dapat diubah di sini. Gunakan tombol reset password untuk mengubah password."
                : "Buat akun pegawai baru. Email login otomatis menjadi NIP@lpd.internal."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>NIP</Label>
              <Input
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value.replace(/\D/g, "") })}
                disabled={isEdit}
                placeholder="6-30 digit angka"
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </div>
            {!isEdit && (
              <div className="space-y-2 md:col-span-2">
                <Label>Password Awal</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 karakter"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Status Kepegawaian</Label>
              <Select
                value={form.status_kepegawaian}
                onValueChange={(v) =>
                  setForm({ ...form, status_kepegawaian: v as "ASN" | "NON ASN" })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASN">ASN</SelectItem>
                  <SelectItem value="NON ASN">NON ASN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role Aplikasi</Label>
              <Select
                value={form.role_user}
                onValueChange={(v) =>
                  setForm({ ...form, role_user: v as "Admin" | "Petugas" })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Petugas">Petugas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Golongan</Label>
              <Select
                value={form.id_golongan ? String(form.id_golongan) : "none"}
                onValueChange={(v) =>
                  setForm({ ...form, id_golongan: v === "none" ? null : Number(v) })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ada —</SelectItem>
                  {(golongan.data ?? []).map((g) => (
                    <SelectItem key={g.id_golongan} value={String(g.id_golongan)}>
                      {g.nama_golongan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jabatan</Label>
              <Input
                value={form.jabatan}
                onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Unit</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-md border border-outline-variant p-3">
              <div>
                <div className="font-medium text-sm">Kepala UPTD</div>
                <div className="text-xs text-on-surface-variant">
                  Aktifkan jika user ini dapat dipilih sebagai penanda tangan SPT.
                </div>
              </div>
              <Switch
                checked={form.is_kepala_uptd}
                onCheckedChange={(v) => setForm({ ...form, is_kepala_uptd: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>Batal</Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetFor} onOpenChange={(o) => { if (!o) { setResetFor(null); setResetPwd(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set password baru untuk <b>{resetFor?.nama}</b> (NIP {resetFor?.nip}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Password Baru</Label>
            <Input
              type="password"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              placeholder="Min. 6 karakter"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetFor(null); setResetPwd(""); }} disabled={busy}>
              Batal
            </Button>
            <Button onClick={doReset} disabled={busy}>
              {busy ? "Memproses…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus akun <b>{confirmDel?.nama}</b> (NIP {confirmDel?.nip}).
              Tindakan ini akan menghapus akun login dan data profilnya secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doDelete(); }}
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

function Pill({
  kind,
  children,
}: {
  kind: "asn" | "non" | "admin" | "petugas";
  children: React.ReactNode;
}) {
  const map = {
    asn: "bg-primary/10 text-primary",
    non: "bg-on-surface-variant/15 text-on-surface-variant",
    admin: "bg-secondary/15 text-secondary",
    petugas: "bg-tertiary/15 text-tertiary",
  } as const;
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide",
        map[kind],
      )}
    >
      {children}
    </span>
  );
}
