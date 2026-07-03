import { useMemo, useRef, useState, type JSX } from 'react';
import { MenuBar, type Menu } from './ui/MenuBar.js';
import './ui/shell.css';

/** A file picked from disk for a project open. */
export interface PickedHomeFile { name: string; text: string }

// KiCad's own dark-theme icons (GPL), vendored under assets/.
const TILE_ICONS = import.meta.glob('./assets/launcher/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const MGR_ICONS = import.meta.glob('./assets/manager/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const tileUrl = (id: string): string | undefined => TILE_ICONS[`./assets/launcher/${id}.svg`];
const mgrUrl = (name: string): string | undefined => MGR_ICONS[`./assets/manager/${name}.svg`];

interface Tile {
  id: string;
  name: string;
  desc: string;
  enabled?: boolean;
}

const TILES: Tile[] = [
  { id: 'schematic', name: 'Schematic Editor', desc: 'Edit the project schematic', enabled: true },
  { id: 'symbols', name: 'Symbol Editor', desc: 'Edit global and/or project schematic symbol libraries' },
  { id: 'pcb', name: 'PCB Editor', desc: 'Edit the project PCB design' },
  { id: 'footprints', name: 'Footprint Editor', desc: 'Edit global and/or project PCB footprint libraries' },
  { id: 'gerber', name: 'Gerber Viewer', desc: 'Preview Gerber files' },
  { id: 'image', name: 'Image Converter', desc: 'Convert bitmap images to schematic symbols or PCB footprints' },
  { id: 'calculator', name: 'Calculator Tools', desc: 'Show tools for calculating resistance, current capacity, etc.' },
  { id: 'drawingsheet', name: 'Drawing Sheet Editor', desc: 'Edit drawing sheet borders and title blocks for use in schematics and PCB designs' },
  { id: 'pcm', name: 'Plugin and Content Manager', desc: 'Manage downloadable packages from KiCad and 3rd party repositories' },
];

// KiCad project-manager left toolbar (toolbars_kicad_manager.cpp).
const MGR_TOOLS: ({ icon: string; title: string; action?: 'open' } | 'sep')[] = [
  { icon: 'new_project_from_template', title: 'New Project…' },
  { icon: 'open_project', title: 'Open Project…', action: 'open' },
  'sep',
  { icon: 'zip', title: 'Archive Project…' },
  { icon: 'unzip', title: 'Unarchive Project…' },
  'sep',
  { icon: 'refresh', title: 'Refresh' },
  'sep',
  { icon: 'directory_browser', title: 'Browse Project Files' },
];

const tileIcon = (id: string): JSX.Element => {
  const url = tileUrl(id);
  return url ? <img src={url} alt="" /> : <span style={{ width: 44, height: 44 }} />;
};

const TreeIcon = ({ name }: { name: string }): JSX.Element => {
  const url = mgrUrl(name);
  return url ? <img src={url} alt="" /> : <span style={{ width: 18, height: 18 }} />;
};

const basename = (p: string): string => p.split('/').pop()!.split('\\').pop()!;

const treeIconFor = (file: string): string =>
  /\.kicad_pro$/i.test(file) ? 'project_kicad'
  : /\.kicad_sch$/i.test(file) ? 'icon_eeschema_24'
  : /\.kicad_sym$/i.test(file) ? 'library'
  : /\.kicad_pcb$/i.test(file) ? 'icon_pcbnew_24'
  : 'directory_browser';

/**
 * KiCad-style project manager: open a project folder, see its files in the
 * tree, then launch the Schematic Editor on it — the same workflow as the
 * desktop app's project window. Until a project is opened, the bundled demo
 * project is shown.
 */
export function HomePage({ projectName, onOpenSchematic, onOpenProject }: {
  projectName: string;
  onOpenSchematic: () => void;
  onOpenProject?: (files: PickedHomeFile[]) => void;
}): JSX.Element {
  const dirInputRef = useRef<HTMLInputElement>(null);
  // The picked project's files (shown in the tree until the editor is launched).
  const [picked, setPicked] = useState<PickedHomeFile[] | null>(null);

  // Read every picked file; keep the KiCad file types for the tree, hand the
  // .kicad_pro / .kicad_sch set to the editor when a schematic is launched.
  const onPicked = async (list: FileList | null): Promise<void> => {
    if (!list || list.length === 0) return;
    const wanted = [...list].filter((f) => /\.(kicad_sch|kicad_pro|kicad_sym|kicad_pcb|kicad_dru)$/i.test(f.name));
    const files = await Promise.all(wanted.map(async (f) => ({
      name: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      text: /\.(kicad_sch|kicad_pro)$/i.test(f.name) ? await f.text() : '',
    })));
    if (files.length > 0) setPicked(files);
  };

  const proFile = useMemo(() => picked?.find((f) => /\.kicad_pro$/i.test(f.name)) ?? null, [picked]);
  const displayName = proFile ? basename(proFile.name).replace(/\.kicad_pro$/i, '') : projectName;

  // Tree order: the .kicad_pro first, then schematics, then the rest.
  const treeFiles = useMemo(() => {
    if (!picked) return null;
    const rank = (n: string): number => (/\.kicad_pro$/i.test(n) ? 0 : /\.kicad_sch$/i.test(n) ? 1 : 2);
    return [...picked].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  }, [picked]);

  const launchSchematic = (): void => {
    if (picked && onOpenProject) onOpenProject(picked);
    else onOpenSchematic();
  };

  // KiCad's project-manager File menu (the working subset).
  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'Open Project…', icon: 'open', action: () => dirInputRef.current?.click(), shortcut: 'Ctrl+O' },
        { label: 'Open Demo Project', action: () => { setPicked(null); onOpenSchematic(); } },
        { sep: true },
        { label: 'Close Project', action: () => setPicked(null), disabled: !picked },
      ],
    },
    { label: 'View', items: [{ label: 'Refresh', action: () => {} }] },
    {
      label: 'Tools',
      items: [{ label: 'Edit Schematic', action: launchSchematic, shortcut: 'Ctrl+E' }],
    },
    { label: 'Help', items: [{ label: 'About ZiroEDA', action: () => {} }] },
  ];

  return (
    <div className="ze-app">
      <input
        ref={dirInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        // Non-standard but universally supported attribute: pick a whole folder.
        {...{ webkitdirectory: '' }}
        onChange={(e) => { void onPicked(e.target.files); e.target.value = ''; }}
      />

      <MenuBar menus={menus} />

      <div className="ze-home-body">
        {/* far-left vertical toolbar */}
        <div className="ze-mgrbar">
          {MGR_TOOLS.map((t, i) =>
            t === 'sep' ? (
              <span key={`s${i}`} className="sep" />
            ) : (
              <button
                key={t.icon}
                title={t.title}
                aria-label={t.title}
                onClick={t.action === 'open' ? () => dirInputRef.current?.click() : undefined}
              >
                <img src={mgrUrl(t.icon)} alt="" />
              </button>
            ),
          )}
        </div>

        {/* project file tree */}
        <div className="ze-panel left" style={{ width: 290 }}>
          <div className="ze-panel-header">Project Files</div>
          <div className="ze-panel-body">
            {treeFiles ? (
              <>
                <div className="ze-tree-item root active">
                  <span className="twisty">▾</span>
                  <TreeIcon name="project_kicad" />
                  <span>{displayName}</span>
                </div>
                {treeFiles.map((f) => (
                  <div
                    key={f.name}
                    className="ze-tree-item"
                    style={{ paddingLeft: 24, cursor: /\.kicad_sch$/i.test(f.name) ? 'pointer' : 'default' }}
                    title={/\.kicad_sch$/i.test(f.name) ? 'Open in the Schematic Editor' : f.name}
                    onClick={/\.kicad_sch$/i.test(f.name) ? launchSchematic : undefined}
                  >
                    <TreeIcon name={treeIconFor(f.name)} />
                    <span>{basename(f.name)}</span>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="ze-tree-item root active">
                  <span className="twisty">▾</span>
                  <TreeIcon name="project_kicad" />
                  <span>{projectName}.kicad_pro</span>
                </div>
                <div className="ze-tree-item" style={{ paddingLeft: 24 }} onClick={onOpenSchematic}>
                  <TreeIcon name="icon_eeschema_24" />
                  <span>{projectName}.kicad_sch</span>
                </div>
                <div
                  className="ze-tree-item"
                  style={{ marginTop: 12, fontWeight: 600 }}
                  onClick={() => dirInputRef.current?.click()}
                  title="Pick your KiCad project folder (.kicad_pro + all .kicad_sch sheets)"
                >
                  📂 Open KiCad Project…
                </div>
              </>
            )}
          </div>
        </div>

        {/* launcher tiles */}
        <div className="ze-launchers">
          {TILES.map((t) => (
            <button
              key={t.id}
              className="ze-launcher"
              disabled={!t.enabled}
              title={t.desc}
              onClick={t.enabled ? launchSchematic : undefined}
            >
              <span className="ico">{tileIcon(t.id)}</span>
              <span className="txt">
                <span className="name">{t.name}</span>
                <span className="desc">{t.desc}</span>
              </span>
              {!t.enabled && <span className="soon">coming soon</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="ze-statusbar">
        <span className="cell grow">
          Project: {proFile ? proFile.name : `~/projects/${projectName}/${projectName}.kicad_pro`}
        </span>
      </div>
    </div>
  );
}
