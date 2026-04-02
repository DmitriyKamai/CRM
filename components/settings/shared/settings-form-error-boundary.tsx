"use client";

import React, { Component } from "react";

type Props = {
  children: React.ReactNode;
  /** Префикс в console.error при отлове ошибки */
  logPrefix?: string;
};

export class SettingsFormErrorBoundary extends Component<
  Props,
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: (error as Error)?.message ?? String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const prefix = this.props.logPrefix ?? "[SettingsForm]";
    console.error(`${prefix} render error:`, error, info?.componentStack);
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
