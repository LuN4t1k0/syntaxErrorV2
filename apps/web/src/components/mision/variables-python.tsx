import type { VariableVisible } from "@syntaxerror/engines/python";

// Las variables que dejó el código, con su tipo y su valor: así «Ejecutar» muestra algo aunque el código no imprima nada,
// y se ve si un valor quedó como texto ('450000') o como número (450000).
export function VariablesPython({ variables }: { variables: VariableVisible[] }) {
  if (variables.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <caption className="bg-surface-raised px-3 py-2 text-left text-xs text-muted-foreground">Variables después de ejecutar</caption>
        <thead className="bg-surface-raised">
          <tr>
            <th scope="col" className="px-3 py-2 font-bold">Variable</th>
            <th scope="col" className="px-3 py-2 font-bold">Tipo</th>
            <th scope="col" className="px-3 py-2 font-bold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {variables.map((variable) => (
            <tr key={variable.nombre} className="border-t border-border">
              <td className="px-3 py-2 font-mono">{variable.nombre}</td>
              <td className="px-3 py-2 font-mono text-muted-foreground">{variable.tipo}</td>
              <td className="break-all px-3 py-2 font-mono">{variable.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
