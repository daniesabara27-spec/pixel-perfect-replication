import {
  LayoutDashboard,
  Search,
  PackageCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  Droplets,
  ClipboardCheck,
  Sun,
  FileText,
  TriangleAlert,
  BookOpen,
  Download,
  Warehouse,
  Settings,
} from "lucide-react";

export const GUDANG = [
  { label: "KCC", gudang: "KCC" },
  { label: "WX 1", gudang: "WX1" },
  { label: "WX 2", gudang: "WX2" },
  { label: "WX 3", gudang: "WX3" },
  { label: "WX Temp", gudang: "WXTEMP" },
] as const;

export const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Pencarian Barang", to: "/pencarian-barang", icon: Search },
  { label: "Input Packing", to: "/packing", icon: PackageCheck },
  { label: "Input Inbound", to: "/inbound", icon: ArrowDownToLine },
  { label: "Input Outbound", to: "/outbound", icon: ArrowUpFromLine },
  { label: "Input Transfer", to: "/transfer", icon: Repeat },
  { label: "Moisture Container", to: "/moisture-container", icon: Droplets },
  { label: "Inspeksi Pengiriman", to: "/inspeksi-pengiriman", icon: ClipboardCheck },
  { label: "Inspeksi Penyimpanan Outdoor", to: "/inspeksi-outdoor", icon: Sun },
  { label: "Laporan Akhir Shift", to: "/laporan-shift", icon: FileText },
  { label: "Nearmiss Accident", to: "/nearmiss", icon: TriangleAlert },
  { label: "Instruksi Kerja", to: "/instruksi-kerja", icon: BookOpen },
  { label: "Tarik Data", to: "/tarik-data", icon: Download },
  { label: "Pengaturan", to: "/pengaturan", icon: Settings },
] as const;

export const AUDIT_RAK = { label: "Audit Rak", icon: Warehouse } as const;
