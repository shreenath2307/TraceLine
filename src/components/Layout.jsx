import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Background from "./Background";
import PauseButton from "./PauseButton";
import PageGuide from "./PageGuide";

export default function Layout({ children }) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <Background />
      <Navbar />
      <main id="main-content">
        {children}
      </main>
      <Footer />
      <PauseButton />
      {pathname !== "/" && <PageGuide />}
    </>
  );
}
