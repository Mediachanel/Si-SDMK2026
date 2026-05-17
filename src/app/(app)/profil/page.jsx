"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import RoleBadge from "@/components/ui/RoleBadge";
import { creationOptionsFromJSON, isWebAuthnAvailable, serializePublicKeyCredential } from "@/lib/auth/webauthnClient";

export default function ProfilPage() {
  const [user, setUser] = useState(null);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [passkeyError, setPasskeyError] = useState("");

  async function loadPasskeys() {
    const response = await fetch("/api/auth/passkey/credentials", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setPasskeys(payload.data.passkeys || []);
    }
  }

  useEffect(() => {
    fetch("/api/auth/me").then((res) => res.json()).then((payload) => setUser(payload.data));
    loadPasskeys().catch(() => setPasskeys([]));
  }, []);

  async function registerPasskey() {
    setPasskeyMessage("");
    setPasskeyError("");

    if (!isWebAuthnAvailable()) {
      setPasskeyError("Browser atau perangkat ini belum mendukung passkey. Gunakan Chrome/Edge/Safari terbaru di HTTPS atau localhost.");
      return;
    }

    setPasskeyLoading(true);
    try {
      const label = `Passkey ${new Date().toLocaleDateString("id-ID")}`;
      const optionsResponse = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label })
      });
      const optionsPayload = await optionsResponse.json();
      if (!optionsResponse.ok || !optionsPayload.success) {
        throw new Error(optionsPayload.message || "Pendaftaran passkey belum dapat dimulai.");
      }

      const credential = await navigator.credentials.create({
        publicKey: creationOptionsFromJSON(optionsPayload.data.options)
      });
      const verifyResponse = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: serializePublicKeyCredential(credential), label })
      });
      const verifyPayload = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyPayload.success) {
        throw new Error(verifyPayload.message || "Passkey belum dapat disimpan.");
      }

      setPasskeyMessage("Passkey berhasil didaftarkan. Sekarang Finger/Face bisa dipakai dari halaman login.");
      await loadPasskeys();
    } catch (error) {
      setPasskeyError(error?.name === "NotAllowedError" ? "Pendaftaran passkey dibatalkan." : (error.message || "Pendaftaran passkey belum berhasil."));
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Profil Akun" description="Informasi sesi pengguna yang sedang aktif." breadcrumbs={[{ label: "Profil Akun" }]} />
      <section className="surface max-w-2xl p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="label">Username</dt><dd className="mt-1 text-sm text-slate-800">{user?.username}</dd></div>
          <div><dt className="label">Role</dt><dd className="mt-1"><RoleBadge role={user?.role} /></dd></div>
          <div><dt className="label">UKPD</dt><dd className="mt-1 text-sm text-slate-800">{user?.nama_ukpd}</dd></div>
          <div><dt className="label">Wilayah</dt><dd className="mt-1 text-sm text-slate-800">{user?.wilayah}</dd></div>
        </dl>
      </section>

      <section className="surface mt-5 max-w-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                <Fingerprint className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Login Biometrik</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Daftarkan passkey perangkat untuk login dengan Finger atau Face.</p>
              </div>
            </div>
          </div>
          <button type="button" onClick={registerPasskey} disabled={passkeyLoading} className="btn-primary bg-gradient-to-r from-dinkes-600 via-cyan-600 to-emerald-500 shadow-[0_10px_24px_rgba(14,116,144,0.22)] hover:brightness-95">
            {passkeyLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            Daftarkan Passkey
          </button>
        </div>

        {passkeyMessage ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{passkeyMessage}</p> : null}
        {passkeyError ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{passkeyError}</p> : null}

        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Passkey Terdaftar</p>
          {passkeys.length ? (
            <div className="mt-3 grid gap-2">
              {passkeys.map((passkey) => (
                <div key={passkey.credential_id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-100">
                  <span className="font-semibold text-slate-800">{passkey.label}</span>
                  <span className="text-xs font-medium text-slate-500">{passkey.last_used_at ? `Dipakai ${passkey.last_used_at}` : `Dibuat ${passkey.created_at}`}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-500">Belum ada passkey. Setelah didaftarkan, tombol Finger/Face di halaman login akan aktif untuk akun ini.</p>
          )}
        </div>
      </section>
    </>
  );
}
