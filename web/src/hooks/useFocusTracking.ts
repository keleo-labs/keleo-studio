"use client";

import { useState, useCallback } from 'react';

export type FocusedField = {
  path: string;
  rect: DOMRect;
};

export type UseFocusTrackingReturn = {
  focusedField: FocusedField | null;
  handleFieldFocus: (path: string, rect: DOMRect) => void;
  handleFieldBlur: () => void;
};

export function useFocusTracking(): UseFocusTrackingReturn {
  const [focusedField, setFocusedField] = useState<FocusedField | null>(null);

  const handleFieldFocus = useCallback((path: string, rect: DOMRect) => {
    setFocusedField({ path, rect });
  }, []);

  const handleFieldBlur = useCallback(() => {
    // Don't immediately clear - let the toolbar stay visible briefly
    setTimeout(() => {
      setFocusedField(null);
    }, 150);
  }, []);

  return {
    focusedField,
    handleFieldFocus,
    handleFieldBlur,
  };
}
