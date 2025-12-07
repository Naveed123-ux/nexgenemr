"use client";

import { useState, useEffect } from "react";

/**
 * A custom hook to determine if the component has mounted on the client.
 * This is useful for preventing server-client hydration mismatches when
 * rendering components that are only meant for the client.
 * @returns {boolean} - True if the component is mounted, false otherwise.
 */
export const useMounted = (): boolean => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
};
