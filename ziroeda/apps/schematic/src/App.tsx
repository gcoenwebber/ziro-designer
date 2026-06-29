import { useMemo, useState } from 'react';
import { parse, readSchematic, type Schematic } from '@ziroeda/core';
import { SchematicCanvas } from './components/SchematicCanvas.js';
import sampleText from './sample.kicad_sch?raw';

export function App(): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  const schematic = useMemo<Schematic | null>(() => {
    try {
      return readSchematic(parse(sampleText));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          borderBottom: '1px solid #ccc',
          background: '#f4f4f4',
          fontSize: 14,
        }}
      >
        <strong>ZiroEDA</strong>
        <span style={{ color: '#666' }}>Schematic viewer</span>
        {schematic && (
          <span style={{ marginLeft: 'auto', color: '#666' }}>
            {schematic.symbols.length} symbol(s) · {schematic.lines.length} wire(s) ·{' '}
            {schematic.labels.length} label(s) — drag to pan, scroll to zoom
          </span>
        )}
      </header>
      <main style={{ flex: 1, minHeight: 0 }}>
        {error ? (
          <pre style={{ color: 'crimson', padding: 16 }}>Failed to load schematic: {error}</pre>
        ) : schematic ? (
          <SchematicCanvas schematic={schematic} />
        ) : null}
      </main>
    </div>
  );
}
