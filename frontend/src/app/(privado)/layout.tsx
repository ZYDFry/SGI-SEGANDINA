import MarcoPrivado from "@/components/MarcoPrivado";

/** Marco de las pantallas con sesión: encabezado, menú lateral por rol y contenido. */
export default function LayoutPrivado({ children }: LayoutProps<"/">) {
  return <MarcoPrivado>{children}</MarcoPrivado>;
}
