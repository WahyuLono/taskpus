import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addGolongan,
  deleteGolongan,
  listGolongan,
  updateGolongan,
} from "@/lib/master.functions";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { SimpleNameCrud } from "@/components/master/simple-name-crud";

export const Route = createFileRoute("/_authenticated/master/golongan")({
  component: Page,
});

function Page() {
  const { isAdmin, isLoading } = useRequireAdmin();
  const qc = useQueryClient();
  const list = useServerFn(listGolongan);
  const add = useServerFn(addGolongan);
  const upd = useServerFn(updateGolongan);
  const del = useServerFn(deleteGolongan);

  const q = useQuery({
    queryKey: ["master_golongan"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  const rows = useMemo(
    () =>
      (q.data ?? []).map((r) => ({ id: r.id_golongan, nama: r.nama_golongan })),
    [q.data],
  );

  if (isLoading || !isAdmin) return null;

  return (
    <SimpleNameCrud
      title="Golongan"
      subtitle="Kelola tingkat golongan pegawai ASN"
      labelNama="Nama Golongan"
      rows={rows}
      loading={q.isLoading}
      onAdd={async (nama) => {
        await add({ data: { nama } });
        toast.success("Golongan ditambahkan");
        qc.invalidateQueries({ queryKey: ["master_golongan"] });
      }}
      onUpdate={async (id, nama) => {
        await upd({ data: { id, nama } });
        toast.success("Golongan diperbarui");
        qc.invalidateQueries({ queryKey: ["master_golongan"] });
      }}
      onDelete={async (id) => {
        await del({ data: { id } });
        toast.success("Golongan dihapus");
        qc.invalidateQueries({ queryKey: ["master_golongan"] });
      }}
    />
  );
}
