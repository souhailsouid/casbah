import * as React from "react";
import { Body, Button, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";

interface Props {
  subject: string;
  title: string;
  lines: string[];
  cta?: { label: string; url: string };
  locale: "fr" | "en" | "ar";
}

/** Un seul gabarit pour tous les événements : titre, lignes, bouton facultatif. Charte : sable, brun, or. */
export function ReservationEmail({ subject, title, lines, cta, locale }: Props) {
  const rtl = locale === "ar";
  return (
    <Html lang={locale} dir={rtl ? "rtl" : "ltr"}>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>LA CASBAH</Text>
            <Text style={brandSub}>HAMMAM · SPA · RESTAURANT</Text>
          </Section>
          <Section style={content}>
            <Text style={h1}>{title}</Text>
            {lines.map((l, i) => (
              <Text key={i} style={p}>
                {l}
              </Text>
            ))}
            {cta && (
              <Button href={cta.url} style={button}>
                {cta.label}
              </Button>
            )}
          </Section>
          <Hr style={hr} />
          <Section>
            <Text style={footer}>La Casbah — 77680 Roissy-en-Brie</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = { backgroundColor: "#F1E8D4", fontFamily: "Georgia, 'Times New Roman', serif", margin: 0, padding: "24px 0" };
const container: React.CSSProperties = { backgroundColor: "#1E1409", color: "#F1E8D4", maxWidth: 560, margin: "0 auto", padding: "32px 36px", border: "1px solid #C9A45C" };
const header: React.CSSProperties = { textAlign: "center", marginBottom: 24 };
const brand: React.CSSProperties = { color: "#F1E8D4", fontSize: 20, letterSpacing: "0.3em", margin: 0 };
const brandSub: React.CSSProperties = { color: "#C9A45C", fontSize: 10, letterSpacing: "0.3em", margin: "6px 0 0" };
const content: React.CSSProperties = {};
const h1: React.CSSProperties = { fontSize: 26, fontWeight: 400, color: "#F1E8D4", margin: "0 0 18px" };
const p: React.CSSProperties = { fontSize: 15, lineHeight: 1.6, color: "rgba(241,232,212,.8)", margin: "0 0 12px" };
const button: React.CSSProperties = { backgroundColor: "#C9A45C", color: "#130D07", fontSize: 13, letterSpacing: "0.12em", padding: "14px 26px", textDecoration: "none", display: "inline-block", marginTop: 12 };
const hr: React.CSSProperties = { borderColor: "rgba(201,164,92,.3)", margin: "28px 0 14px" };
const footer: React.CSSProperties = { fontSize: 11, letterSpacing: "0.1em", color: "rgba(241,232,212,.5)", margin: 0, textAlign: "center" };
