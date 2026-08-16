import { Table } from "@/components/ui/Table";
import { listMaterials } from "@/lib/academic/materials";
import { utcToZurichLabel } from "@/lib/dates";

/**
 * Read-only lecture folder listing (docs/03-pages/academic.md §6). Stage 6 turns
 * this corpus into cited answers; showing it now is what gets the PDFs filed in
 * the first place. Server component — it reads the filesystem.
 */
export function MaterialsList({ slug }: { slug: string }) {
  const { dir, files } = listMaterials(slug);

  return (
    <div>
      <Table
        columns={["File", "Size", "Modified"]}
        empty={`nothing filed yet — drop lecture PDFs into ${dir}`}
      >
        {files.map((f) => (
          <tr key={f.name}>
            <td className="px-3 py-2">{f.name}</td>
            <td className="tabular px-3 py-2 text-xs text-muted">{fileSize(f.size)}</td>
            <td className="px-3 py-2 text-xs text-muted">
              {utcToZurichLabel(f.modified.slice(0, 19).replace("T", " "))}
            </td>
          </tr>
        ))}
      </Table>
      {files.length > 0 && (
        <p className="mt-2 text-[11px] text-faint">
          {files.length} {files.length === 1 ? "file" : "files"} in {dir} · week-prefixed names
          (03-attention.pdf) sort into teaching order
        </p>
      )}
    </div>
  );
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
