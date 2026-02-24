import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { ArrowLeft, User, Mail, Phone, Calendar, ImagePlus } from "lucide-react";
import { getPublicPhotoUrl } from "@/lib/storage";
import { ClientActions } from "@/components/clients/ClientActions";
import { RateClient } from "@/components/clients/RateClient";
import { NewVisitSection } from "@/components/clients/NewVisitSection";
import { MergeGuestIntoClient } from "@/components/clients/MergeGuestIntoClient";
import { isGuestProfile } from "@/lib/clients";
import { getClaimCodeForGuest } from "@/app/dashboard/clients/actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("clients");
  const locale = await getLocale();
  const localeStr = locale === "ru" ? "ru-RU" : "cs-CZ";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/auth/login", locale });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (profile?.role !== "admin") redirect({ href: "/dashboard", locale });

  const { data: client } = await supabase
    .from("profiles")
    .select("id, display_name, email, phone, created_at")
    .eq("id", id)
    .eq("role", "client")
    .single();
  if (!client) notFound();

  const [{ count: visitsCount }, { data: ratings }, { data: warnings }, { data: visits }] =
    await Promise.all([
      supabase.from("visits").select("*", { count: "exact", head: true }).eq("client_id", id),
      supabase
        .from("client_ratings")
        .select("id, rating, note, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_warnings")
        .select("id, warning_type, reason, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("visits")
        .select(
          `
          id,
          notes,
          created_at,
          appointments ( start_at, end_at, status ),
          visit_photos ( id, storage_path, public )
        `
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
    ]);

  type VisitRow = {
    id: string;
    notes: string | null;
    created_at: string;
    appointments: { start_at: string; end_at: string; status: string } | null;
    visit_photos: { id: string; storage_path: string; public: boolean }[];
  };

  const warningsCount = warnings?.filter((w) => w.warning_type === "warning").length ?? 0;
  const isBanned = warnings?.some((w) => w.warning_type === "ban") ?? false;
  const latestRating = ratings?.[0]?.rating ?? null;
  const visitRows = (visits ?? []) as unknown as VisitRow[];
  const claimCode = isGuestProfile(client.email) ? await getClaimCodeForGuest(id) : null;

  return (
    <div className="space-y-6 pb-6">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-2 text-primary-600 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToClients")}
      </Link>

      <section className="rounded-xl border border-primary-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-primary-800">
              {client.display_name || t("noName")}
            </h1>
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-1.5 text-sm text-primary-600 mt-0.5"
              >
                <Mail className="w-4 h-4" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-1.5 text-sm text-primary-600 mt-0.5"
              >
                <Phone className="w-4 h-4" />
                {client.phone}
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-primary-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-700">{visitsCount ?? 0}</p>
            <p className="text-xs text-primary-500">{t("visits")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-700">
              {latestRating != null ? `${latestRating} ★` : "–"}
            </p>
            <p className="text-xs text-primary-500">{t("rating")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-700">{warningsCount}</p>
            <p className="text-xs text-primary-500">{t("warnings")}</p>
          </div>
        </div>
      </section>

      {isGuestProfile(client.email) && (
        <MergeGuestIntoClient guestProfileId={id} guestDisplayName={client.display_name} claimCode={claimCode} />
      )}

      <ClientActions
        clientId={id}
        isBanned={isBanned}
        warningsCount={warningsCount}
        warnings={warnings ?? []}
      />
      <RateClient clientId={id} currentRating={latestRating} />

      <section className="rounded-xl border border-primary-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-primary-800 mb-1 flex items-center gap-2">
          <ImagePlus className="w-5 h-5" />
          {t("photoUpload")}
        </h2>
        <p className="text-sm text-primary-500 mb-4">{t("photoUploadDesc")}</p>
        <NewVisitSection
          clientId={id}
          hideTitle
          visitOptions={visitRows.map((v) => ({
          id: v.id,
          dateLabel: v.appointments?.start_at
            ? new Date(v.appointments.start_at).toLocaleDateString(localeStr, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : new Date(v.created_at).toLocaleDateString(localeStr),
        }))}
        />
      </section>

      <section id="visits">
        <h2 className="text-lg font-semibold text-primary-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t("visitHistory")}
        </h2>
        {!visits?.length ? (
          <p className="text-sm text-primary-500">{t("noVisitsYet")}</p>
        ) : (
          <ul className="space-y-4">
            {[...visitRows]
              .sort((a, b) => {
                const da = a.appointments?.start_at ?? a.created_at;
                const db = b.appointments?.start_at ?? b.created_at;
                return new Date(db).getTime() - new Date(da).getTime();
              })
              .map((visit) => {
                const apt = visit.appointments;
                const dateStr = apt?.start_at
                  ? new Date(apt.start_at).toLocaleDateString(localeStr, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : new Date(visit.created_at).toLocaleDateString(localeStr);
                return (
                  <li
                    key={visit.id}
                    className="rounded-xl border border-primary-200 bg-primary-50/50 p-4"
                  >
                    <p className="font-medium text-primary-800">{dateStr}</p>
                    {visit.notes && (
                      <p className="text-sm text-primary-600 mt-1">{visit.notes}</p>
                    )}
                    {visit.visit_photos?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {visit.visit_photos.map((photo) => (
                          <a
                            key={photo.id}
                            href={getPublicPhotoUrl(photo.storage_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-20 h-20 rounded-lg overflow-hidden bg-primary-200 border border-primary-200"
                          >
                            <Image
                              src={getPublicPhotoUrl(photo.storage_path)}
                              alt={t("photoFromVisit")}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
