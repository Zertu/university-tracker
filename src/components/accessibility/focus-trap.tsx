'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  isActive: boolean;
  restoreFocus?: boolean;
  initialFocus?: string; // CSS selector for initial focus element
}

export function FocusTrap({ 
  children, 
  isActive, 
  restoreFocus = true,
  initialFocus 
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');

      return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Set initial focus
    const setInitialFocus = () => {
      let elementToFocus: HTMLElement | null = null;

      if (initialFocus) {
        elementToFocus = container.querySelector(initialFocus) as HTMLElement;
      }

      if (!elementToFocus) {
        const focusableElements = getFocusableElements();
        elementToFocus = focusableElements[0];
      }

      if (elementToFocus) {
        elementToFocus.focus();
      }
    };

    // Add event listener and set initial focus
    document.addEventListener('keydown', handleKeyDown);
    setInitialFocus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, initialFocus, restoreFocus]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}

// Hook for managing focus programmatically
export function useFocusManagement() {
  const focusElement = (selector: string, delay = 0) => {
    setTimeout(() => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
      }
    }, delay);
  };

  const focusFirstError = () => {
    const errorElement = document.querySelector('[aria-invalid="true"], .error') as HTMLElement;
    if (errorElement) {
      errorElement.focus();
    }
  };

  const focusMainContent = () => {
    const mainContent = document.getElementById('main-content') as HTMLElement;
    if (mainContent) {
      mainContent.focus();
    }
  };

  return {
    focusElement,
    focusFirstError,
    focusMainContent
  };
}