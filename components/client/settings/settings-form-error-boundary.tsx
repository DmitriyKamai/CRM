"use client";

import React, { Component } from "react";

export class ClientSettingsFormErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: (error as Error)?.message ?? String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ClientSettingsForm] render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Ошибка при отображении формы настроек. Обновите страницу. ({this.state.message})
        </div>
      );
    }
    return this.props.children;
  }
}
