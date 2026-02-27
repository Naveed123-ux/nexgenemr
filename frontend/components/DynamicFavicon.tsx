"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

export default function DynamicFavicon() {
    const hospital = useSelector((state: RootState) => state.auth?.hospital);

    useEffect(() => {
        if (hospital?.favicon_url) {
            const faviconUrl = hospital.favicon_url;

            // Find or create the icon link element
            let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");

            if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.head.appendChild(link);
            }

            link.href = faviconUrl;

            // Also handle shortcuts icon if needed
            let shortcutLink: HTMLLinkElement | null = document.querySelector("link[rel='shortcut icon']");
            if (shortcutLink) {
                shortcutLink.href = faviconUrl;
            }
        }
    }, [hospital?.favicon_url]);

    return null;
}
