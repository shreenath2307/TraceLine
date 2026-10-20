import React from "react";
import ReactDOM from "react-dom/client";
import { motion } from "framer-motion";
import { AnimationProvider } from "../context/AnimationContext";
import Layout from "../components/Layout";
import BusinessPage from "../pages/BusinessPage";
import "../styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AnimationProvider>
      <Layout>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
        >
          <BusinessPage />
        </motion.div>
      </Layout>
    </AnimationProvider>
  </React.StrictMode>
);
