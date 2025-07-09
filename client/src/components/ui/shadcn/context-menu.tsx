import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  items,
  onClose,
  className,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position
    if (position.x + rect.width > viewport.width) {
      adjustedX = viewport.width - rect.width - 8;
    }

    // Adjust vertical position
    if (position.y + rect.height > viewport.height) {
      adjustedY = viewport.height - rect.height - 8;
    }

    menu.style.left = `${Math.max(8, adjustedX)}px`;
    menu.style.top = `${Math.max(8, adjustedY)}px`;
  }, [isOpen, position]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 min-w-[180px]',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          className={cn(
            'block w-full text-left px-4 py-2 text-sm transition-colors',
            item.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
          )}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
        >
          <span className="flex items-center gap-2">
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
};