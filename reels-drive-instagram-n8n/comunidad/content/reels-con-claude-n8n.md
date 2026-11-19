Publicar un reel al día suena fácil hasta que lo intentas durante tres semanas seguidas. No es el video: es todo lo que lo rodea. Pensar el gancho, escribir el guion, grabar la voz, montar, exportar, subir, acordarte del caption, acordarte de la portada, acordarte de publicar. Y al día siguiente otra vez.

Lo que sigue es el sistema con el que dejé de hacer la mitad de eso. Son dos piezas que encajan: una skill de Claude Code que arma el reel, y un flujo de n8n que lo publica solo.

Las dos son gratis y las dos se descargan al final.

## Las dos mitades

**La skill hace el reel.** Te entrevista una vez para sacar tu marca —colores, tipografías, tono, voz, qué dices y qué nunca dirías— y lo guarda. De ahí en adelante, cada reel sale con esa identidad sin que tengas que repetirla. Escribe el copy eligiendo entre una biblioteca de 106 moldes de gancho, genera la voz, monta el video en código y lo deja masterizado al volumen que esperan Instagram y TikTok.

**El flujo lo publica.** Todos los días a la hora que elijas toma una carpeta de Google Drive y la publica como reel. Con su caption y su portada. Después mueve la carpeta a «publicados» y se olvida.

El punto de encuentro entre las dos es una carpeta con tres archivos. La skill la deja; el flujo la toma. No hay pegamento en el medio, ni un servicio que cobre por conectarlas.

Puedes usar solo una. Si grabas tú los videos, el flujo igual los publica. Si solo quieres que Claude te arme los reels, la skill te deja la carpeta y la subes a mano.

## Por qué una carpeta y no una API

La primera versión de esto intentaba ser elegante: la skill terminaba y llamaba al flujo, que publicaba al instante.

Fue un error por dos razones. La primera es que acoplaba las piezas: cambiar una obligaba a tocar la otra. La segunda, más importante, es que te quitaba el momento de mirar el video antes de que saliera.

Una carpeta en Drive es una cola que puedes abrir, revisar, reordenar y vaciar desde el teléfono. Si un reel no te convence, lo sacas de la carpeta. Si quieres que salga antes, le cambias la fecha del nombre. Nadie tiene que saber cómo funciona el flujo para gobernarlo.

El formato de la carpeta es tres archivos:

```
2026-12-01-tema-del-reel/
  tema-del-reel.mp4
  portada.png
  caption.txt
```

El nombre empieza con la fecha, en formato año-mes-día. No es decoración: el flujo ordena las carpetas por nombre y publica la primera, y con la fecha en ese formato el orden alfabético es el cronológico. Una carpeta llamada «reel bueno» se va al final de la cola y no entiendes por qué.

## El gancho es el 90 % del trabajo

La parte de la skill que más me cambió los números no fue la edición: fue la biblioteca de ganchos.

Son 106 moldes. No frases para copiar, moldes: estructuras con huecos que rellenas con tu tema, tu número real y tus palabras. «Nunca hagas (X) porque (consecuencia)». «Estas son las únicas (número) (cosas) que necesitas para (resultado)». «Te voy a explicar por qué (decisión contraintuitiva) y por qué la mayoría de (expertos) también lo hacen».

Los que vienen de reels que ya funcionaron traen las vistas del original, como referencia de su potencia. No como promesa: el mismo molde con otro tema y otra cara da otro resultado. Sirve para saber cuáles aguantan peso.

La skill elige por intención —romper una creencia, enseñar un paso a paso, comparar dos opciones, contar un resultado propio— y te propone tres. Tú eliges.

Y luego están las reglas, que son las que cuesta respetar cuando escribes solo:

**La primera palabra es el gancho.** Nada de «hola», «bienvenidos», logo ni intro. La voz empieza en el segundo cero.

**Un número concreto en los primeros cuatro segundos**, cuando se pueda.

**Afirmación fuerte antes que pregunta.** La pregunta funciona, pero es la minoría.

**El gancho se lee además de oírse.** Va en pantalla, grande.

**Algo se mueve antes del segundo dos.** Nunca una pantalla quieta.

**Cero cifras inventadas.** Si el molde dice «la más rápida» y no lo puedes demostrar, se cambia por un hecho concreto. La skill te devuelve al final una lista de cada cifra del guion con su fuente, y marca las que no tienen. Esa lista es incómoda a propósito.

## El video se escribe, no se arrastra

El montaje es con Remotion: cada escena es un componente de React y el video se renderiza desde código.

Suena a complicación innecesaria hasta que publicas el quinto reel. Con un editor de línea de tiempo, el quinto reel cuesta lo mismo que el primero. Con código, el quinto es cambiar datos: los textos, los tiempos, qué escena va en cada tramo. La animación ya está escrita.

Y hay un efecto secundario que no esperaba: la marca deja de desviarse. Los colores salen de un archivo, no del ojo. El acento es el mismo acento en los treinta reels. Las letras no cambian porque ese día abriste otra plantilla.

Las escenas se sincronizan con la voz por palabra, no por cronómetro. La voz se transcribe con tiempos y cada escena declara en qué palabra del guion entra. Si regrabas la voz y queda medio segundo más larga, el video se reacomoda solo.

Antes de renderizar, la skill saca fotogramas sueltos y los mira: texto cortado, una escena que entra antes de que la voz lo diga, algo metido en la zona que Instagram tapa con sus botones. Es el paso que más errores atrapa, y cuesta diez segundos.

## El flujo, por dentro

Son veintitrés nodos, pero el recorrido se cuenta en una frase: busca la carpeta más vieja sin publicar, comprueba que tenga los tres archivos, la apunta, hace públicos el video y la portada en Drive, le pasa a Instagram el enlace del video, espera a que termine de procesarlo y publica.

Tres decisiones que vale la pena explicar, porque son las que lo hacen aburrido en el buen sentido.

**Meta descarga el video; no se lo subimos.** Suena al revés, pero es el único camino para las apps con inicio de sesión de Instagram. Meta documenta una subida por trozos para reels, y está disponible solo para las apps con Facebook Login. Si la intentas con el otro tipo de app, Meta ignora el parámetro, cae al camino normal y responde «The parameter video_url is required». Ese error me costó dos días de publicaciones antes de entender que no era un parámetro mal puesto, sino un camino cerrado.

**La carpeta se apunta antes de publicar, no después.** Si algo revienta a mitad, la carpeta queda marcada y no se reintenta sola: hay que borrar la fila. Es incómodo, y es deliberado. La alternativa es el riesgo contrario, que es publicar el mismo reel dos veces, y eso en Instagram no se puede deshacer bonito.

**Si falta un archivo, no publica.** Una carpeta sin caption, o con el mp4 a medio subir, no sale: se reintenta al día siguiente. Más vale un día tarde que un reel sin texto.

## Lo que se rompe y cómo se ve

**El token vence a los sesenta días.** Es el que muerde. Cuando vence, el flujo deja de publicar y no avisa. Se renueva con una llamada, y hay que hacerlo antes de los sesenta días: pasado ese punto ya no se puede renovar y hay que generar uno nuevo desde el panel.

**El id equivocado.** Instagram te muestra dos números para la misma cuenta, y solo uno sirve para la API. Si usas el otro, Meta responde «Invalid OAuth 2.0 Access Token» y te hace sospechar del token estando el token perfecto.

**El servidor apagado.** Si n8n corre en tu máquina y se apaga de madrugada, el disparador no suena. Este flujo lo perdona: al día siguiente toma la misma carpeta, porque nunca se marcó. El que no lo perdona es el flujo de comentarios, que pierde lo que llegue mientras está caído.

**El video grande.** Pasado cierto tamaño, el enlace de descarga de Drive devuelve una página de aviso de antivirus en vez del archivo, y Meta no sabe qué hacer con eso. Los reels normales están lejos de ese límite.

## Lo que no hace

No revisa el video: si Instagram lo rechaza por duración o proporción, te enteras por la tabla. No avisa de los errores; quedan anotados y hay que ir a mirar. No quita el permiso público de Drive después de publicar: el mp4 y la portada quedan accesibles con el enlace. Y no contesta los comentarios, que es otra automatización.

Nada de eso es difícil de agregar. Lo dejé fuera porque cada pieza que agregas es una pieza que alguien tiene que entender para instalarlo.

## Lo que cambia cuando funciona

El cambio real no es el tiempo que ahorras montando. Es que publicar deja de ser una decisión diaria.

Cuando cada reel requiere sentarse, abrir el editor y acordarte de subirlo, la constancia depende de tu ánimo de ese día. Cuando hay una cola en Drive y algo que la vacía solo, la constancia depende de que la cola tenga cosas. Y llenar una cola un domingo es mucho más fácil que publicar un martes a las dos de la tarde.

## ¿Y ahora qué sigue?

🎬 **Móntalo tú, con las dos piezas hechas.** Es gratis. [Descarga el flujo de n8n](./descargas/flujo-reels-instagram.json) y [la skill de Claude Code](./descargas/reels-con-claude-SKILL.md). El flujo trae los veintitrés nodos conectados y toda la configuración en un solo sitio; la skill trae la biblioteca de 106 ganchos y el sistema de marca. Es lo mismo que corre en mi cuenta, con mis datos cambiados por marcadores.

🔧 **Te lo dejo instalado.** Configuro la app de Meta, conecto Drive, dejo el flujo publicando y la skill lista con tu marca cargada. Tú solo apruebas reels.

[Hablemos de tu agente o automatización](https://cal.com/geiner-porras-aj8irz/ia-30min)
