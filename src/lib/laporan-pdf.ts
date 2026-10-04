import { supabase } from "@/integrations/supabase/client";

export type Seksi = { judul: string; head: string[]; body: (string | number)[][] };
export type Alat = { nama: string; jumlah: string; kondisi: string; keterangan: string };

async function pdfKit() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { jsPDF, autoTable };
}

const BIRU: [number, number, number] = [37, 99, 235];

function header(doc: any, judul: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("KCC GLASS INDONESIA", w / 2, 16, { align: "center" });
  doc.setFontSize(12);
  doc.text(judul, w / 2, 23, { align: "center" });
  doc.setDrawColor(...BIRU);
  doc.setLineWidth(0.6);
  doc.line(14, 27, w - 14, 27);
  return 33;
}

function tandaTangan(doc: any, y: number, label: string[], nama: string[] = []) {
  const w = doc.internal.pageSize.getWidth();
  if (y + 40 > doc.internal.pageSize.getHeight() - 10) { doc.addPage(); y = 20; }
  const lebar = (w - 28) / label.length;
  doc.setFontSize(9);
  label.forEach((l, i) => {
    const x = 14 + i * lebar;
    doc.setFont("helvetica", "bold");
    doc.text(l, x + lebar / 2, y + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.rect(x + 2, y, lebar - 4, 36);
    doc.text(nama[i] ? `( ${nama[i]} )` : "(                          )", x + lebar / 2, y + 32, { align: "center" });
  });
}

const fmtTgl = (t: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(t + "T00:00:00"));

export async function pdfLaporanShift(d: { tanggal: string; shift: string; pic: string; seksi: Seksi[]; alat: Alat[] }) {
  const { jsPDF, autoTable } = await pdfKit();
  const doc = new jsPDF();
  let y = header(doc, "LAPORAN AKHIR SHIFT LOGISTIK");
  autoTable(doc, { startY: y, theme: "plain", styles: { fontSize: 10, cellPadding: 1 }, body: [["Tanggal", ": " + fmtTgl(d.tanggal)], ["Shift", ": " + d.shift], ["PIC", ": " + (d.pic || "-")]], columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" } } });
  y = (doc as any).lastAutoTable.finalY + 6;
  const semua: Seksi[] = [...d.seksi, { judul: "ALAT", head: ["No", "Nama Alat", "Jumlah", "Kondisi", "Keterangan"], body: d.alat.map((a, i) => [i + 1, a.nama, a.jumlah || "-", a.kondisi || "-", a.keterangan || "-"]) }];
  for (const s of semua) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    if (y > 260) { doc.addPage(); y = 20; }
    doc.text(s.judul, 14, y);
    autoTable(doc, { startY: y + 2, head: [s.head], body: s.body.length ? s.body : [[{ content: "Tidak ada data", colSpan: s.head.length, styles: { halign: "center" } } as any]], headStyles: { fillColor: BIRU }, styles: { fontSize: 9 } });
    y = (doc as any).lastAutoTable.finalY + 8;
  }
  tandaTangan(doc, y + 2, ["Dibuat Oleh", "Diperiksa Oleh", "Disetujui Oleh"], [d.pic]);
  return doc.output("blob");
}

/** Perkecil foto jadi JPEG dataURL agar PDF tidak terlalu besar. */
export async function fotoKeDataUrl(file: File, max = 1200): Promise<{ url: string; w: number; h: number }> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return { url: c.toDataURL("image/jpeg", 0.8), w: c.width, h: c.height };
}

export async function pdfNearmiss(d: { tanggal: string; jam: string; shift: string; pic: string; barcode: string; description: string; manpower: { nama: string; jabatan: string }[]; kronologi: string; foto: File[] }) {
  const { jsPDF, autoTable } = await pdfKit();
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  let y = header(doc, "BERITA ACARA — NEARMISS ACCIDENT");
  autoTable(doc, { startY: y, theme: "grid", styles: { fontSize: 10 }, columnStyles: { 0: { cellWidth: 40, fontStyle: "bold", fillColor: [224, 242, 254] } },
    body: [["Tanggal", fmtTgl(d.tanggal)], ["Jam", d.jam || "-"], ["Shift", d.shift], ["PIC", d.pic || "-"], ["No Barcode", d.barcode || "-"], ["Description", d.description || "-"]] });
  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Manpower Terlibat", 14, y);
  autoTable(doc, { startY: y + 2, head: [["No", "Nama", "Jabatan"]], body: d.manpower.length ? d.manpower.map((m, i) => [i + 1, m.nama, m.jabatan || "-"]) : [["-", "-", "-"]], headStyles: { fillColor: BIRU }, styles: { fontSize: 9 } });
  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold"); doc.text("Kronologi", 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  for (const line of doc.splitTextToSize(d.kronologi || "-", W - 28)) {
    y += 5; if (y > H - 15) { doc.addPage(); y = 20; }
    doc.text(line, 14, y);
  }
  y += 8;
  if (d.foto.length) {
    if (y > H - 60) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Foto", 14, y); y += 4;
    const kolom = (W - 28 - 6) / 2;
    let x = 14, tinggiBaris = 0;
    for (const f of d.foto) {
      const img = await fotoKeDataUrl(f);
      const h = Math.min(kolom * (img.h / img.w), 90);
      const w = h * (img.w / img.h);
      if (y + h > H - 12) { doc.addPage(); y = 20; x = 14; tinggiBaris = 0; }
      doc.addImage(img.url, "JPEG", x, y, w, h);
      tinggiBaris = Math.max(tinggiBaris, h);
      if (x === 14) x = 14 + kolom + 6; else { x = 14; y += tinggiBaris + 6; tinggiBaris = 0; }
    }
    y += tinggiBaris + 8;
  }
  tandaTangan(doc, y, ["Dibuat Oleh", "Diketahui Oleh", "Diketahui Oleh", "Mengetahui Oleh"], [d.pic]);
  return doc.output("blob");
}

export async function simpanPdf(blob: Blob, folder: string) {
  const path = `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from("laporan").upload(path, blob, { contentType: "application/pdf" });
  if (error) throw error;
  return path;
}

export async function bukaFile(bucket: string, path: string, download?: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600, download ? { download } : undefined);
  if (error) throw error;
  if (download) window.location.href = data.signedUrl;
  else window.open(data.signedUrl, "_blank", "noopener");
}

export const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
