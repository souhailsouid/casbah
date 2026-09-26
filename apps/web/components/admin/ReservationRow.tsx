"use client";

import Link from "next/link";
import { FORFAITS, STATUS_LABELS_FR, type Reservation } from "@casbah/shared";

const JOURS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function dateLabel(date: string): { dow: string; day: number; month: string } {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return { dow: JOURS[dt.getDay()]!, day: d, month: MOIS[m - 1]! };
}

export function StatusBadge({ status }: { status: Reservation["status"] }) {
  return <span className={"badge " + status}>{STATUS_LABELS_FR[status]}</span>;
}

export default function ReservationRow({
  r,
  busy,
  onConfirm,
  onDecline,
}: {
  r: Reservation;
  busy?: boolean;
  onConfirm?: (r: Reservation) => void;
  onDecline?: (r: Reservation) => void;
}) {
  const l = dateLabel(r.date);
  return (
    <div className={"adm-row " + r.status}>
      <div className="when">
        <small>
          {l.dow} {l.day} {l.month}
        </small>
        <b>{r.hour}h00</b>
      </div>
      <div className="who">
        <b>
          {r.customer.name} · {r.persons} pers.
        </b>
        <span>
          {FORFAITS[r.forfait].nom} · {r.espace === "femmes" ? "Femmes" : "Hommes"} · {r.customer.phone}
          {r.customer.whatsappOptIn ? " · WhatsApp" : ""}
        </span>
        {r.notes && <span>« {r.notes} »</span>}
      </div>
      <div className="acts">
        {r.status === "pending" && onConfirm && onDecline ? (
          <>
            <button className="btn sm" type="button" disabled={busy} onClick={() => onConfirm(r)}>
              <span>CONFIRMER</span>
            </button>
            <button className="btn sm danger" type="button" disabled={busy} onClick={() => onDecline(r)}>
              <span>REFUSER</span>
            </button>
          </>
        ) : (
          <StatusBadge status={r.status} />
        )}
        <Link className="btn sm ghost" href={`/admin/reservation?id=${r.id}`}>
          <span>DÉTAIL</span>
        </Link>
      </div>
    </div>
  );
}
