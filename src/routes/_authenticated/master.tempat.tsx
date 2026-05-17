import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addTempat,
  deleteTempat,
  listTempat,
  updateTempat,
} from "@/lib/master.functions";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { SimpleNameCrud } from "@/components/master/simple-name-crud";

export const Route = createFileRoute("/_authenticated/master/tempat")({
  component: Page,
});

function Page() {
  const { isAdmin, isLoading } = useRequireAdmin();
  const qc = useQueryClient();
  const list = useServerFn(listTempat);
  const add = useServerFn(addTempat);
  const upd = useServerFn(updateTempat);
  const del = useServerFn(deleteTempat);

  const q = useQuery({
    queryKey: ["master_tempat"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  const rows = useMemo(
    () => (q.data ?? []).map((r) => ({ id: r.id_tempat, nama: r.nama_tempat })),
    [q.data],
  );

  if (isLoading || !isAdmin) return null;

  return (
    <SimpleNameCrud
      title="Tempat Tujuan"
      subtitle="Daftar tempat tujuan perjalanan dinas"
      labelNama="Nama Tempat"
      rows={rows}
      loading={q.isLoading}
      onAdd={async (nama) => {
        await add({ data: { nama } });
        toast.success("Tempat ditambahkan");
        qc.invalidateQueries({ queryKey: ["master_tempat"] });
      }}
      onUpdate={async (id, nama) => {
        await upd({ data: { id, nama } });
        toast.success("Tempat diperbarui");
        qc.invalidateQueries({ queryKey: ["master_tempat"] });
      }}
      onDelete={async (id) => {
        await del({ data: { id } });
        toast.success("Tempat dihapus");
        qc.invalidateQueries({ queryKey: ["master_tempat"] });
      }}
    />
  );
}
