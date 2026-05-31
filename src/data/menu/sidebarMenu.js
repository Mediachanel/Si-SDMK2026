import {
  BriefcaseBusiness,
  ClipboardList,
  FileSpreadsheet,
  Home,
  LogOut,
  Settings,
  UploadCloud,
  UsersRound,
  ShieldCheck,
  Bell,
  MoreHorizontal
} from "lucide-react";
import { ROLES } from "@/lib/constants/roles";

export const sidebarMenu = [
  { label: "Dashboard", href: "/dashboard", icon: Home, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Data Pegawai", href: "/pegawai", icon: UsersRound, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Data Pejabat", href: "/pejabat", icon: BriefcaseBusiness, roles: [ROLES.SUPER_ADMIN] },
  {
    label: "Master Jabatan",
    icon: BriefcaseBusiness,
    roles: [ROLES.SUPER_ADMIN],
    children: [
      { label: "Jabatan Menpan", href: "/master-jabatan/menpan", icon: BriefcaseBusiness, roles: [ROLES.SUPER_ADMIN] },
      { label: "Jabatan ORB", href: "/master-jabatan/orb", icon: ClipboardList, roles: [ROLES.SUPER_ADMIN] }
    ]
  },
  {
    label: "Usulan",
    icon: ClipboardList,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD],
    children: [
      { label: "Usulan Mutasi", href: "/usulan/mutasi", icon: BriefcaseBusiness, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
      { label: "Usulan Putus JF", href: "/usulan/putus-jf", icon: ClipboardList, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] }
    ]
  },
  { label: "Import Excel Pegawai", href: "/import-pegawai", icon: FileSpreadsheet, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_UKPD] },
  { label: "Import DRH", href: "/import-drh", icon: UploadCloud, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_UKPD] },
  { label: "Daftar Urut Kepangkatan", href: "/duk", icon: FileSpreadsheet, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Pengaturan", href: "/profil", icon: Settings, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Logout", href: "/api/auth/logout", icon: LogOut, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD], action: "logout" }
];

export const desktopMenu = [
  { label: "Dashboard", href: "/dashboard", icon: Home, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Data Pegawai", href: "/pegawai", icon: UsersRound, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Data Pejabat", href: "/pejabat", icon: BriefcaseBusiness, roles: [ROLES.SUPER_ADMIN] },
  {
    label: "Master Jabatan",
    icon: BriefcaseBusiness,
    roles: [ROLES.SUPER_ADMIN],
    children: [
      { label: "Jabatan Menpan", href: "/master-jabatan/menpan", icon: BriefcaseBusiness, roles: [ROLES.SUPER_ADMIN] },
      { label: "Jabatan ORB", href: "/master-jabatan/orb", icon: ClipboardList, roles: [ROLES.SUPER_ADMIN] }
    ]
  },
  {
    label: "Import Data",
    icon: ShieldCheck,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_UKPD],
    children: [
      { label: "Import Excel Pegawai", href: "/import-pegawai", icon: FileSpreadsheet, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_UKPD] },
      { label: "Import DRH", href: "/import-drh", icon: UploadCloud, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_UKPD] }
    ]
  },
  {
    label: "Usulan",
    icon: BriefcaseBusiness,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD],
    children: [
      { label: "Usulan Mutasi", href: "/usulan/mutasi", icon: BriefcaseBusiness, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
      { label: "Usulan Putus JF", href: "/usulan/putus-jf", icon: ClipboardList, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] }
    ]
  },
  { label: "Daftar Urut Kepangkatan", href: "/duk", icon: FileSpreadsheet, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Pengaturan", href: "/profil", icon: Settings, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Logout", href: "/api/auth/logout", icon: LogOut, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD], action: "logout" }
];

export const mobileBottomMenu = [
  { label: "Dashboard", href: "/dashboard", icon: Home, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Pegawai", href: "/pegawai", icon: UsersRound, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "DUK", href: "/duk", icon: FileSpreadsheet, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Notifikasi", href: "/dashboard", icon: Bell, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] },
  { label: "Lainnya", href: "/profil", icon: MoreHorizontal, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD] }
];

export function filterMenuByRole(role) {
  return sidebarMenu
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => child.roles.includes(role))
    }));
}

export function filterDesktopMenuByRole(role) {
  return desktopMenu
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => child.roles.includes(role))
    }));
}

export function filterMobileBottomMenuByRole(role) {
  return mobileBottomMenu.filter((item) => item.roles.includes(role));
}
