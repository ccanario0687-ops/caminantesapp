import { useState } from "react";
import { Drawer } from "vaul";
import { Check, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MobileSelect({ value, onChange, options, name, placeholder = "Seleccionar...", className = "" }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const opts = (options || []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const hasEmpty = opts.some((o) => o.value === "");
  const selected = opts.find((o) => o.value === value);

  if (!isMobile) {
    return (
      <select
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        {!hasEmpty && <option value="">{placeholder}</option>}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${className} text-left flex items-center justify-between gap-2 min-h-[44px]`}
      >
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-amber-500 shrink-0" />
      </button>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Content className="max-h-[75vh] outline-none">
          <div className="mx-auto w-full max-w-md bg-white rounded-t-2xl">
            <div className="h-1.5 w-10 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 text-center">
              <p className="text-sm font-semibold text-gray-700">{placeholder}</p>
            </div>
            <div className="overflow-y-auto max-h-[58vh] py-1">
              {opts.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-left text-sm transition-colors ${
                    o.value === value ? "bg-amber-50 text-amber-800 font-semibold" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{o.label}</span>
                  {o.value === value && <Check className="w-4 h-4 text-amber-600" />}
                </button>
              ))}
            </div>
            <div className="safe-bottom" />
          </div>
        </Drawer.Content>
      </Drawer.Root>
    </>
  );
}