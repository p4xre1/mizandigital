"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

interface UIContextType {
  // 🔐 Auth Modal State
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  toggleAuthModal: () => void;

  // 📱 Mobile Slide-out Navigation Drawer State
  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;

  // 🔍 Mobile Fullscreen Search Overlay State
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  // 🧹 Utility to close all mobile overlays at once (e.g., on route navigation)
  closeAllOverlays: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 🔒 Prevent background body scrolling when mobile drawers or modals are open
  useEffect(() => {
    const isAnyOverlayOpen = isAuthModalOpen || isMobileMenuOpen || isSearchOpen;
    
    if (isAnyOverlayOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none"; // Disables touch scrolling leak on iOS
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isAuthModalOpen, isMobileMenuOpen, isSearchOpen]);

  // ⚙️ Memoized Handlers for smooth mobile performance
  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);
  const toggleAuthModal = useCallback(() => setIsAuthModalOpen((prev) => !prev), []);

  const openMobileMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen((prev) => !prev), []);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSearch = useCallback(() => setIsSearchOpen((prev) => !prev), []);

  const closeAllOverlays = useCallback(() => {
    setIsAuthModalOpen(false);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      toggleAuthModal,
      isMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      isSearchOpen,
      openSearch,
      closeSearch,
      toggleSearch,
      closeAllOverlays,
    }),
    [
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      toggleAuthModal,
      isMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      isSearchOpen,
      openSearch,
      closeSearch,
      toggleSearch,
      closeAllOverlays,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};