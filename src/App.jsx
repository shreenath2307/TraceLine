import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AnimationProvider } from "./context/AnimationContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import BusinessPage from "./pages/BusinessPage";
import PricingPage from "./pages/PricingPage";
import SecurityPage from "./pages/SecurityPage";
import ConsolePage from "./pages/ConsolePage";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/business" element={<BusinessPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/console" element={<ConsolePage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AnimationProvider>
      <BrowserRouter>
        <Layout>
          <AnimatedRoutes />
        </Layout>
      </BrowserRouter>
    </AnimationProvider>
  );
}
