import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addRangka,
  deleteRangka,
  listRangka,
  updateRangka,
} from "@/lib/master.functions";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { SimpleNameCrud } from "@/components/master/simple-name-crud";

export const Route = createFileRoute("/_authenticated/master/rangka")({
  component: Page,
});

function Page() {
  const { isAdmin, isLoading } = useRequireAdmin();
  const qc = useQueryClient();
  const list = useServerFn(listRangka);
  const add = useServerFn(addRangka);
  const upd = useServerFn(updateRangka);
  const del = useServerFn(deleteRangka);

  const q = useQuery({
    queryKey: ["master_rangka"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  const rows = useMemo(
    () => (q.data ?? []).map((r) => ({ id: r.id_rangka, nama: r.nama_rangka })),
    [q.data],
  );

  if (isLoading || !isAdmin) return null;

  return (
    <SimpleNameCrud
      title="Rangka Kegiatan"
      subtitle="Daftar jenis rangka kegiatan perjalanan dinas"
      labelNama="Nama Rangka"
      rows={rows}
      loading={q.isLoading}
      onAdd={async (nama) => {
        await add({ data: { nama } });
        toast.success("Rangka ditambahkan");
        qc.invalidateQueries({ queryKey: ["master_rangka"] });
      }}
      onUpdate={async (id, nama) => {
        await upd({ data: { id, nama } });
        toast.success("Rangka diperbarui");
        qc.invalidateQueries({ queryKey: ["master_rangka"] });
      }}
      onDelete={async (id) => {
        await del({ data: { id } });
        toast.success("Rangka dihapus");
        qc.invalidateQueries({ queryKey: ["master_rangka"] });
      }}
    />
  );
}
