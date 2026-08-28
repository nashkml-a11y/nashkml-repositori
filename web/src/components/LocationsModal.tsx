import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { api, type Item, type Location } from "../api";

interface LocationsModalProps {
  onClose: () => void;
  onChanged: () => void;
}

export function LocationsModal({ onClose, onChanged }: LocationsModalProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [locationItems, setLocationItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  async function reload() {
    setLoading(true);
    const data = await api.listLocations();
    setLocations(data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await api.createLocation(name.trim(), description.trim() || null);
      setName("");
      setDescription("");
      await reload();
      onChanged();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Algo ha fallado");
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(id: number) {
    if (!editName.trim()) return;
    try {
      await api.updateLocation(id, { name: editName.trim() });
      setEditingId(null);
      await reload();
      onChanged();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Algo ha fallado");
    }
  }

  async function handleDelete(id: number) {
    setErrorMsg("");
    try {
      await api.deleteLocation(id);
      await reload();
      onChanged();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Algo ha fallado");
    }
  }

  async function openLocationItems(loc: Location) {
    setViewingLocation(loc);
    setItemsLoading(true);
    try {
      setLocationItems(await api.listItemsByLocation(loc.id));
    } finally {
      setItemsLoading(false);
    }
  }

  if (viewingLocation) {
    return (
      <Modal title={viewingLocation.name} onClose={onClose}>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setViewingLocation(null)}
            className="self-start text-sm font-medium text-indigo-700"
          >
            ← Volver a ubicaciones
          </button>

          {itemsLoading && <p className="text-sm text-stone-400">Cargando...</p>}
          {!itemsLoading && locationItems.length === 0 && (
            <p className="text-sm text-stone-400">No hay objetos guardados en esta ubicación.</p>
          )}
          {!itemsLoading && locationItems.length > 0 && (
            <div className="flex flex-col gap-2">
              {locationItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-stone-100 p-3">
                  {item.photo && (
                    <img src={item.photo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-stone-900">{item.name}</p>
                    {item.position_detail && (
                      <p className="text-xs text-stone-400">{item.position_detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Ubicaciones" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-2xl bg-stone-50 p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre, ej. Baúl 3"
            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base text-stone-900 focus:border-indigo-400 focus:outline-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base text-stone-900 focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="rounded-xl bg-indigo-700 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "Guardando..." : "+ Añadir ubicación"}
          </button>
        </div>

        {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

        <div className="flex flex-col gap-2">
          {loading && <p className="text-sm text-stone-400">Cargando...</p>}
          {!loading && locations.length === 0 && (
            <p className="text-sm text-stone-400">Todavía no has creado ninguna ubicación.</p>
          )}
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between gap-2 rounded-xl border border-stone-100 p-3">
              {editingId === loc.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="flex-1 rounded-lg border border-stone-200 p-2 text-sm"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => openLocationItems(loc)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm font-medium text-stone-900">{loc.name}</p>
                  {loc.description && <p className="text-xs text-stone-400">{loc.description}</p>}
                </button>
              )}
              <div className="flex shrink-0 gap-1">
                {editingId === loc.id ? (
                  <button
                    type="button"
                    onClick={() => handleRename(loc.id)}
                    className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Guardar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(loc.id);
                      setEditName(loc.name);
                    }}
                    className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600"
                  >
                    Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(loc.id)}
                  className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-red-500"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
