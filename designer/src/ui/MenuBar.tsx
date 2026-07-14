import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { toolbarIconUrl } from './toolbarIcons.js';

export interface MenuItem {
  label?: string;
  /** Tool/action id — its KiCad icon is shown if one is mapped. */
  icon?: string;
  action?: () => void;
  sep?: boolean;
  disabled?: boolean;
  /** Keyboard hint shown right-aligned (e.g. "Ctrl+S"). */
  shortcut?: string;
  /** ACTION_MENU::CHECK items — shows a checkmark when true. */
  checked?: boolean;
  /** Nested submenu (KiCad ACTION_MENU submenus: Import, Export, Attributes…). */
  items?: MenuItem[];
}

export interface Menu {
  label: string;
  items: MenuItem[];
}

function DropdownItems({ items, close }: { items: MenuItem[]; close: () => void }): JSX.Element {
  const [openSub, setOpenSub] = useState<number | null>(null);
  return (
    <>
      {items.map((it, i) =>
        it.sep ? (
          <div key={`s${i}`} className="ze-msep" />
        ) : it.items ? (
          <div
            key={it.label ?? i}
            className={`ze-mitem ze-msub${it.disabled ? ' disabled' : ''}`}
            onMouseEnter={() => setOpenSub(i)}
            onMouseLeave={() => setOpenSub((o) => (o === i ? null : o))}
          >
            <span className="mico">
              {it.icon && toolbarIconUrl(it.icon) ? (
                <img src={toolbarIconUrl(it.icon)} alt="" />
              ) : null}
            </span>
            <span className="lbl">{it.label}</span>
            <span className="sub-arrow">▸</span>
            {openSub === i && !it.disabled && (
              <div className="ze-dropdown ze-subdropdown">
                <DropdownItems items={it.items} close={close} />
              </div>
            )}
          </div>
        ) : (
          <div
            key={it.label ?? i}
            className={`ze-mitem${it.disabled ? ' disabled' : ''}`}
            onClick={() => {
              if (it.disabled) return;
              close();
              it.action?.();
            }}
          >
            <span className="mico">
              {it.checked ? (
                <span className="mcheck">✓</span>
              ) : it.icon && toolbarIconUrl(it.icon) ? (
                <img src={toolbarIconUrl(it.icon)} alt="" />
              ) : null}
            </span>
            <span className="lbl">{it.label}</span>
            {it.shortcut && <span className="sc">{it.shortcut}</span>}
          </div>
        ),
      )}
    </>
  );
}

/** A KiCad-style menu bar with click-to-open dropdowns and hover-to-switch. */
export function MenuBar({
  menus,
  leftSlot,
  rightSlot,
  title,
}: {
  menus: Menu[];
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  /** KiCad-style "<project> — <Editor>" shown in the bar (window-title info). */
  title?: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="ze-menubar" ref={ref}>
      {leftSlot}
      {menus.map((menu) => (
        <div
          key={menu.label}
          className={`ze-menu${open === menu.label ? ' open' : ''}`}
          onClick={() => setOpen((o) => (o === menu.label ? null : menu.label))}
          onMouseEnter={() => open && setOpen(menu.label)}
        >
          {menu.label}
          {open === menu.label && (
            <div className="ze-dropdown" onClick={(e) => e.stopPropagation()}>
              <DropdownItems items={menu.items} close={() => setOpen(null)} />
            </div>
          )}
        </div>
      ))}
      {title && <div className="ze-menubar-title">{title}</div>}
      {rightSlot}
    </div>
  );
}
