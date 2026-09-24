"use client";

import { I18nProvider } from "@/lib/i18n";
import { SiteProvider } from "@/lib/site-context";
import Loader from "@/components/Loader";
import Effects from "@/components/Effects";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Bains from "@/components/Bains";
import Table from "@/components/Table";
import Offrir from "@/components/Offrir";
import Groupes from "@/components/Groupes";
import Avis from "@/components/Avis";
import Infos from "@/components/Infos";
import Footer from "@/components/Footer";
import ResaDrawer from "@/components/ResaDrawer";
import GiftDrawer from "@/components/GiftDrawer";
import DevisDrawer from "@/components/DevisDrawer";
import CarteDrawer from "@/components/CarteDrawer";

export default function Page() {
  return (
    <I18nProvider>
      <SiteProvider>
        <Loader />
        <Effects />
        <Nav />
        <main>
          <Hero />
          <Bains />
          <Table />
          <Offrir />
          <Groupes />
          <Avis />
          <Infos />
        </main>
        <Footer />
        <ResaDrawer />
        <GiftDrawer />
        <DevisDrawer />
        <CarteDrawer />
      </SiteProvider>
    </I18nProvider>
  );
}
