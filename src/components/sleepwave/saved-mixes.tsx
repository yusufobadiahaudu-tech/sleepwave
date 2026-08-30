import { Bookmark, Play, Trash2 } from "lucide-react";
import { Sheet } from "@/components/sleepwave/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SOUND_BY_ID } from "@/lib/sleepwave/library";
import type { SavedMix } from "@/lib/sleepwave/types";

export function SaveMixSheet({
  open,
  onClose,
  name,
  onName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  onName: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Name this mix"
      subtitle="Volumes are stored with the mix."
      labelledBy="save-mix-title"
    >
      <label className="mb-2 block text-xs font-medium text-muted" htmlFor="mix-name">
        Mix name
      </label>
      <Input
        id="mix-name"
        value={name}
        onChange={(event) => onName(event.target.value)}
        maxLength={48}
        autoComplete="off"
      />
      <Button variant="primary" className="mt-4 w-full" onClick={onSave}>
        Save mix
      </Button>
    </Sheet>
  );
}

export function SavedMixesSheet({
  open,
  onClose,
  mixes,
  onRestore,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  mixes: SavedMix[];
  onRestore: (mix: SavedMix) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Saved mixes"
      subtitle="Restore volumes with the layers. Premium sounds stay gated."
      labelledBy="saved-mixes-title"
    >
      {mixes.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <Bookmark className="size-6 text-muted" />
          <p className="mt-3 text-sm font-medium text-fg">No mixes yet</p>
          <p className="mt-1 text-sm text-muted">
            Bookmark your mix to keep the blend and the volumes.
          </p>
        </div>
      ) : (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {mixes.map((mix) => (
            <li
              key={mix.id}
              className="flex items-center gap-2 rounded-[18px] bg-elevated p-2"
            >
              <button
                type="button"
                onClick={() => onRestore(mix)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[14px] px-2 text-left"
              >
                <span className="flex size-9 items-center justify-center rounded-[12px] bg-surface text-accent">
                  <Play className="size-3.5 translate-x-px" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">
                    {mix.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {mix.layers
                      .map((layer) => SOUND_BY_ID[layer.id]?.name)
                      .filter(Boolean)
                      .join(" · ") || `${mix.layers.length} layers`}
                  </span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${mix.name}`}
                onClick={() => onDelete(mix.id)}
              >
                <Trash2 className="size-4 text-muted" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
