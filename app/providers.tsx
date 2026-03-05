"use client";

import { ReactNode, useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",
          background: {
            default: "#040914",
            paper: "#0b1220",
          },
          primary: {
            main: "#07d5df",
          },
          secondary: {
            main: "#7dd3fc",
          },
          error: {
            main: "#fb4478",
          },
          text: {
            primary: "#f1f5f9",
            secondary: "#94a3b8",
          },
          divider: "rgba(148,163,184,0.2)",
        },
        shape: {
          borderRadius: 12,
        },
        typography: {
          fontFamily: "var(--font-sans)",
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
        },
      }),
    [],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
