import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

export default function usePrintGuard() {
  const isMobile = useIsMobile();

  const guardedPrint = (fn) => {
    if (isMobile) {
      toast.warning("La impresión no está disponible en dispositivos móviles. Usa una computadora para imprimir.");
      return;
    }
    if (typeof fn === "function") fn();
  };

  return { isMobile, guardedPrint };
}