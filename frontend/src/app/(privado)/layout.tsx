import Encabezado from "@/components/Encabezado";

/** Marco de las pantallas con sesión: encabezado con menú por rol y contenido. */
export default function LayoutPrivado({ children }: LayoutProps<"/">) {
  return (
    <>
      <Encabezado />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>
    </>
  );
}
