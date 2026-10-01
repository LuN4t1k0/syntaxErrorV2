export type Lenguaje = "sql" | "python";
export type EntradaGlosario = { titulo: string; explicacion: string; ejemplo: string };

const e = (titulo: string, explicacion: string, ejemplo: string): EntradaGlosario => ({ titulo, explicacion, ejemplo });

// Explicaciones al pasar el mouse y en las sugerencias (propuesta, sección 10). Cortas, en español y con un ejemplo mínimo.
export const GLOSARIO_SQL: Record<string, EntradaGlosario> = {
  SELECT: e("SELECT", "SELECT elige las columnas que quieres ver en el resultado. Con * ves todas.", "SELECT nombre, ciudad FROM clientes"),
  FROM: e("FROM", "FROM indica de qué tabla salen los datos.", "SELECT * FROM ventas"),
  WHERE: e("WHERE", "WHERE filtra las filas: solo quedan las que cumplen la condición.", "WHERE ciudad = 'Santiago'"),
  AND: e("AND", "AND exige que se cumplan las dos condiciones a la vez.", "WHERE ciudad = 'Temuco' AND monto > 100000"),
  OR: e("OR", "OR deja pasar las filas que cumplen al menos una de las condiciones.", "WHERE ciudad = 'Temuco' OR ciudad = 'Talca'"),
  NOT: e("NOT", "NOT invierte una condición: deja lo que no la cumple.", "WHERE NOT ciudad = 'Santiago'"),
  IN: e("IN", "IN compara con una lista de valores; es más corto que varios OR.", "WHERE ciudad IN ('Temuco', 'Talca')"),
  LIKE: e("LIKE", "LIKE busca textos con un patrón: % reemplaza cualquier cantidad de caracteres.", "WHERE nombre LIKE 'Almacén%'"),
  BETWEEN: e("BETWEEN", "BETWEEN filtra un rango e incluye ambos extremos.", "WHERE monto BETWEEN 50000 AND 100000"),
  IS: e("IS NULL", "IS NULL encuentra las celdas vacías. Con = NULL no funciona.", "WHERE email IS NULL"),
  NULL: e("NULL", "NULL significa «sin valor»: no es 0 ni un texto vacío.", "WHERE email IS NULL"),
  AS: e("AS", "AS le pone otro nombre a una columna o a una tabla en la consulta.", "SELECT SUM(monto) AS total FROM ventas"),
  DISTINCT: e("DISTINCT", "DISTINCT quita las filas repetidas del resultado.", "SELECT DISTINCT ciudad FROM clientes"),
  GROUP: e("GROUP BY", "GROUP BY junta las filas que comparten un valor para resumirlas con COUNT, SUM o AVG.", "SELECT ciudad, COUNT(*) FROM clientes GROUP BY ciudad"),
  HAVING: e("HAVING", "HAVING filtra grupos, después de GROUP BY. WHERE filtra filas, antes de agrupar.", "GROUP BY ciudad HAVING COUNT(*) > 1"),
  ORDER: e("ORDER BY", "ORDER BY ordena el resultado por una o más columnas.", "ORDER BY monto DESC"),
  ASC: e("ASC", "ASC ordena de menor a mayor (o de la A a la Z). Es el orden por defecto.", "ORDER BY nombre ASC"),
  DESC: e("DESC", "DESC ordena de mayor a menor (o de la Z a la A).", "ORDER BY monto DESC"),
  LIMIT: e("LIMIT", "LIMIT corta el resultado a las primeras filas.", "ORDER BY monto DESC LIMIT 3"),
  JOIN: e("JOIN", "JOIN une dos tablas usando una columna que tienen en común.", "FROM ventas JOIN clientes ON ventas.cliente_id = clientes.id"),
  INNER: e("INNER JOIN", "INNER JOIN deja solo las filas que tienen pareja en las dos tablas.", "FROM ventas INNER JOIN clientes ON ventas.cliente_id = clientes.id"),
  LEFT: e("LEFT JOIN", "LEFT JOIN conserva todas las filas de la tabla de la izquierda, aunque no tengan pareja.", "FROM clientes LEFT JOIN ventas ON ventas.cliente_id = clientes.id"),
  ON: e("ON", "ON dice qué columnas deben coincidir para unir las tablas.", "JOIN clientes ON ventas.cliente_id = clientes.id"),
  COUNT: e("COUNT()", "COUNT cuenta filas. COUNT(*) cuenta todas; COUNT(columna) no cuenta las vacías.", "SELECT COUNT(*) FROM ventas"),
  SUM: e("SUM()", "SUM suma los valores de una columna.", "SELECT SUM(monto) FROM ventas"),
  AVG: e("AVG()", "AVG calcula el promedio de una columna.", "SELECT AVG(monto) FROM ventas"),
  MIN: e("MIN()", "MIN devuelve el valor más pequeño de una columna.", "SELECT MIN(monto) FROM ventas"),
  MAX: e("MAX()", "MAX devuelve el valor más grande de una columna.", "SELECT MAX(monto) FROM ventas"),
  ROUND: e("ROUND()", "ROUND redondea un número a los decimales que indiques.", "SELECT ROUND(AVG(monto), 0) FROM ventas"),
  CASE: e("CASE", "CASE elige un valor según condiciones, como SI en una planilla.", "CASE WHEN monto > 100000 THEN 'grande' ELSE 'normal' END"),
  UPDATE: e("UPDATE", "UPDATE cambia valores de filas que ya existen. Sin WHERE cambia todas.", "UPDATE clientes SET ciudad = 'Talca' WHERE id = 3"),
  DELETE: e("DELETE", "DELETE borra filas. Sin WHERE borra todas.", "DELETE FROM ventas WHERE monto = 0"),
  INSERT: e("INSERT", "INSERT agrega filas nuevas a una tabla.", "INSERT INTO clientes (id, nombre) VALUES (7, 'Ana')"),
};

export const GLOSARIO_PYTHON: Record<string, EntradaGlosario> = {
  import: e("import", "import trae una biblioteca para usarla en tu código.", "import pandas as pd"),
  as: e("as", "as le da un nombre corto a lo que importas.", "import pandas as pd"),
  pd: e("pd", "pd es el nombre corto con que se acostumbra importar pandas.", "import pandas as pd"),
  def: e("def", "def crea una función: un bloque de código con nombre que puedes reutilizar.", "def con_iva(monto):\n    return monto * 1.19"),
  return: e("return", "return entrega el resultado de una función y la termina.", "return monto * 1.19"),
  if: e("if", "if ejecuta un bloque solo si la condición se cumple. La línea termina en dos puntos.", "if monto > 100000:\n    print(\"grande\")"),
  elif: e("elif", "elif revisa otra condición si la anterior no se cumplió.", "elif monto > 50000:"),
  else: e("else", "else ejecuta un bloque cuando ninguna condición anterior se cumplió.", "else:\n    print(\"normal\")"),
  for: e("for", "for repite un bloque por cada elemento de una lista o columna.", "for monto in [100, 200]:\n    print(monto)"),
  in: e("in", "in recorre los elementos en un for, o pregunta si un valor está en una lista.", "\"Temuco\" in ciudades"),
  while: e("while", "while repite un bloque mientras la condición se cumpla. Cuida que termine.", "while total < 10:\n    total += 1"),
  print: e("print()", "print muestra un valor en la salida.", "print(ventas.head())"),
  len: e("len()", "len cuenta los elementos de una lista o las filas de un DataFrame.", "len(ventas)"),
  round: e("round()", "round redondea un número; el segundo valor son los decimales.", "round(3.14159, 2)"),
  sum: e("sum()", "sum suma los números de una lista.", "sum([100, 200, 300])"),
  range: e("range()", "range genera números seguidos; no incluye el último.", "for i in range(3):"),
  str: e("str()", "str convierte un valor en texto.", "str(1500)"),
  int: e("int()", "int convierte un texto o un decimal en número entero.", "int(\"42\")"),
  float: e("float()", "float convierte un texto en número decimal; usa punto, no coma.", "float(\"3.5\")"),
  True: e("True", "True es el valor lógico verdadero. Va con mayúscula.", "activo = True"),
  False: e("False", "False es el valor lógico falso. Va con mayúscula.", "activo = False"),
  None: e("None", "None significa «sin valor». Una función sin return devuelve None.", "resultado = None"),
  ".read_csv": e("pd.read_csv()", "read_csv lee un archivo CSV y lo convierte en un DataFrame (una tabla).", "ventas = pd.read_csv(\"datos/ventas.csv\")"),
  ".head": e(".head()", "head muestra las primeras filas de la tabla (5 si no dices cuántas).", "ventas.head(3)"),
  ".tail": e(".tail()", "tail muestra las últimas filas de la tabla.", "ventas.tail()"),
  ".describe": e(".describe()", "describe resume las columnas numéricas: cantidad, promedio, mínimo, máximo y cuartiles.", "ventas.describe()"),
  ".info": e(".info()", "info muestra las columnas, sus tipos y cuántas celdas vacías hay.", "ventas.info()"),
  ".groupby": e(".groupby()", "groupby agrupa las filas que comparten un valor, para resumirlas como GROUP BY en SQL.", "ventas.groupby(\"ciudad\")[\"monto\"].sum()"),
  ".sum": e(".sum()", "sum suma los valores de una columna (o de cada grupo).", "ventas[\"monto\"].sum()"),
  ".mean": e(".mean()", "mean calcula el promedio de una columna.", "ventas[\"monto\"].mean()"),
  ".median": e(".median()", "median calcula la mediana: el valor del medio, que no se deja llevar por extremos.", "ventas[\"monto\"].median()"),
  ".count": e(".count()", "count cuenta los valores que no están vacíos.", "ventas[\"monto\"].count()"),
  ".min": e(".min()", "min devuelve el valor más pequeño.", "ventas[\"monto\"].min()"),
  ".max": e(".max()", "max devuelve el valor más grande.", "ventas[\"monto\"].max()"),
  ".sort_values": e(".sort_values()", "sort_values ordena la tabla por una columna; ascending=False ordena de mayor a menor.", "ventas.sort_values(\"monto\", ascending=False)"),
  ".value_counts": e(".value_counts()", "value_counts cuenta cuántas veces aparece cada valor de una columna.", "clientes[\"ciudad\"].value_counts()"),
  ".unique": e(".unique()", "unique devuelve los valores distintos de una columna.", "clientes[\"ciudad\"].unique()"),
  ".nunique": e(".nunique()", "nunique cuenta cuántos valores distintos hay.", "clientes[\"ciudad\"].nunique()"),
  ".merge": e(".merge()", "merge une dos tablas por una columna en común, como JOIN en SQL.", "ventas.merge(clientes, left_on=\"cliente_id\", right_on=\"id\")"),
  ".reset_index": e(".reset_index()", "reset_index convierte el índice en una columna normal, útil después de groupby.", "por_ciudad.reset_index()"),
  ".loc": e(".loc[]", "loc elige filas y columnas por nombre o con una condición.", "ventas.loc[ventas[\"monto\"] > 100000, \"monto\"]"),
  ".iloc": e(".iloc[]", "iloc elige filas y columnas por posición; la primera es la 0.", "ventas.iloc[0]"),
  ".query": e(".query()", "query filtra filas con una condición escrita como texto.", "ventas.query(\"monto > 100000\")"),
  ".agg": e(".agg()", "agg aplica varias funciones de resumen a la vez.", "ventas[\"monto\"].agg([\"sum\", \"mean\"])"),
  ".dropna": e(".dropna()", "dropna quita las filas que tienen celdas vacías.", "ventas.dropna()"),
  ".fillna": e(".fillna()", "fillna rellena las celdas vacías con un valor.", "ventas[\"monto\"].fillna(0)"),
  ".astype": e(".astype()", "astype cambia el tipo de una columna, por ejemplo de texto a número.", "ventas[\"monto\"].astype(int)"),
  ".shape": e(".shape", "shape dice cuántas filas y columnas tiene la tabla. No lleva paréntesis.", "ventas.shape"),
  ".columns": e(".columns", "columns lista los nombres de las columnas. No lleva paréntesis.", "ventas.columns"),
};

export function palabraEn(texto: string, posicion: number): { desde: number; hasta: number; palabra: string } | null {
  let desde = posicion;
  let hasta = posicion;
  while (desde > 0 && /\w/.test(texto[desde - 1])) desde -= 1;
  while (hasta < texto.length && /\w/.test(texto[hasta])) hasta += 1;
  return desde === hasta ? null : { desde, hasta, palabra: texto.slice(desde, hasta) };
}

export function explicarPalabra(lenguaje: Lenguaje, texto: string, posicion: number): (EntradaGlosario & { desde: number; hasta: number }) | null {
  const encontrada = palabraEn(texto, posicion);
  if (!encontrada) return null;
  const { desde, hasta, palabra } = encontrada;
  const entrada =
    lenguaje === "sql" ? GLOSARIO_SQL[palabra.toUpperCase()] : GLOSARIO_PYTHON[texto[desde - 1] === "." ? `.${palabra}` : palabra];
  return entrada ? { ...entrada, desde, hasta } : null;
}
