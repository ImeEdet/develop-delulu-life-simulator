export function UpdateBanner({ updating, onUpdate }: { updating: boolean; onUpdate: () => void }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[100] px-3 pt-2 safe-top" role="status" aria-live="polite">
      <div className="panel max-w-2xl mx-auto p-2.5 flex flex-wrap items-center gap-2 border-gold/50 shadow-xl shadow-black/40">
        <span className="text-gold shrink-0" aria-hidden="true">✦</span>
        <p className="flex-1 min-w-[120px] text-xs font-bold">A new Delulu Life update is ready.</p>
        <button
          type="button"
          onClick={onUpdate}
          disabled={updating}
          className="btn-primary min-h-10 rounded-lg px-3 py-2 text-xs font-extrabold disabled:opacity-60"
        >
          {updating ? "Restarting…" : "Update & restart"}
        </button>
      </div>
    </div>
  );
}
