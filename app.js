// ==========================================
// 1. BASE DE DATOS LOCAL
// ==========================================
// ==========================================
// 1. BASE DE DATOS LOCAL
// ==========================================
let misLibros = [
    // --- LOTE INGLÉS ---
    { id: "libro-1", titulo: "Short Fiction", autor: "H. P. Lovecraft", archivo: "./books/h-p-lovecraft_short-fiction.epub", progreso: 15, año: "1928" },
    { id: "libro-2", titulo: "The Adventures of Tom Sawyer", autor: "Mark Twain", archivo: "./books/mark-twain_the-adventures-of-tom-sawyer.epub", progreso: 55, año: "1876" },
    { id: "libro-3", titulo: "The Picture of Dorian Gray", autor: "Oscar Wilde", archivo: "./books/oscar-wilde_the-picture-of-dorian-gray.epub", progreso: 0, año: "1890" },
    { id: "libro-4", titulo: "A Study in Scarlet", autor: "Arthur Conan Doyle", archivo: "./books/arthur-conan-doyle_a-study-in-scarlet.epub", progreso: 85, año: "1887" },

    // --- LOTE ESPAÑOL ---
    { id: "libro-5", titulo: "Erecciones, Eyaculaciones, Exhibiciones", autor: "Charles Bukowski", archivo: "./books/Erecciones,Eyaculaciones,Exhibiciones(Charles.Bukowski).epub", progreso: 45, año: "1972" },
    { id: "libro-6", titulo: "Música de Cañerías", autor: "Charles Bukowski", archivo: "./books/Música.de.cañerías(Charles Bukowski).epub", progreso: 12, año: "1983" },
    { id: "libro-7", titulo: "El Rithmatista", autor: "Brandon Sanderson", archivo: "./books/El.Rithmatista(Brandon Sanderson).epub", progreso: 80, año: "2013" },
    { id: "libro-8", titulo: "El Juguete Rabioso", autor: "Roberto Arlt", archivo: "./books/El.juguete.rabioso(Roberto Arlt).epub", progreso: 0, año: "1926" },
    { id: "libro-9", titulo: "Cadáver Exquisito", autor: "Agustina Bazterrica", archivo: "./books/Cadaver.exquisito(Bazterrica Agustina).epub", progreso: 100, año: "2017" }
];

let lectorAbierto = null;

// ==========================================
// 2. ROUTER & RENDERIZADO
// ==========================================
function prenderPantalla(idDestino) {
    document.querySelectorAll('.screen').forEach(p => p.classList.remove('active'));
    document.getElementById(idDestino + '-screen').classList.add('active');
}

async function armarTarjetas(idDelContenedor, listaDeLibros) {
    const cajaContenedora = document.getElementById(idDelContenedor);
    if (!cajaContenedora) return;
    cajaContenedora.innerHTML = '';

    for (const elLibro of listaDeLibros) {
        let fotoPortada = "https://placehold.co/140x210/24272A/7E848C?text=Libro";

        try {
            const libroTemporal = ePub(elLibro.archivo);
            const fotoReal = await libroTemporal.coverUrl();
            if (fotoReal) fotoPortada = fotoReal;
        } catch (error) {
            console.warn(`Sin portada local para: ${elLibro.titulo}`);
        }

        let progresoHTML = elLibro.progreso > 0 ? `<div class="progress-track"><div class="progress-fill" style="width: ${elLibro.progreso}%;"></div></div>` : '';

        const tarjeta = document.createElement('div');
        tarjeta.className = 'card-libro';
        tarjeta.innerHTML = `
            <img src="${fotoPortada}" class="portada-img">
            <h3 class="card-titulo">${elLibro.titulo}</h3>
            <p class="card-autor">${elLibro.autor}</p>
            <p class="card-year">${elLibro.año || 'S/D'}</p>
            ${progresoHTML}
            <button class="btn-abrir-info">+ INFO</button>
        `;

        tarjeta.addEventListener('click', () => { prenderPantalla('reader'); arrancarMotorDeLectura(elLibro); });

        const botonInfo = tarjeta.querySelector('.btn-abrir-info');
        botonInfo.addEventListener('click', (evento) => {
            evento.stopPropagation();
            abrirOverlayInfo(elLibro, fotoPortada);
        });

        cajaContenedora.appendChild(tarjeta);
    }
}

// ==========================================
// 3. BUSCADOR GUTENDEX API
// ==========================================
async function buscarLibrosEnAPI(termino, idioma) {
    const contenedorResultados = document.getElementById('grid-explore');
    contenedorResultados.innerHTML = '<p style="color: var(--text-secondary); width:100%; text-align:center;">Analizando archivos mundiales...</p>';

    try {
        // Construimos la URL agregando el filtro de idioma si el usuario eligió uno
        let urlBusqueda = `https://gutendex.com/books/?search=${termino}`;
        if (idioma !== "") urlBusqueda += `&languages=${idioma}`;

        const respuesta = await fetch(urlBusqueda);
        const data = await respuesta.json();

        contenedorResultados.innerHTML = '';

        if (data.results.length === 0) {
            contenedorResultados.innerHTML = '<p style="color: var(--text-secondary); width:100%; text-align:center;">No se encontraron documentos.</p>';
            return;
        }

        const librosEncontrados = data.results.slice(0, 10);

        librosEncontrados.forEach(libroAPI => {
            const linkEpub = libroAPI.formats['application/epub+zip'];
            if (!linkEpub) return;

            const tarjetaBusqueda = document.createElement('div');
            tarjetaBusqueda.className = 'card-libro';

            const autorNombre = libroAPI.authors.length > 0 ? libroAPI.authors[0].name : "Autor Desconocido";
            const fotoPortadaAPI = libroAPI.formats['image/jpeg'] || "https://placehold.co/140x210/24272A/7E848C?text=Sin+Portada";

            tarjetaBusqueda.innerHTML = `
                <img src="${fotoPortadaAPI}" class="portada-img">
                <h3 class="card-titulo">${libroAPI.title}</h3>
                <p class="card-autor">${autorNombre}</p>
                <p class="card-year">GUTENDEX ID: ${libroAPI.id}</p>
                <button class="btn-abrir-info btn-descargar" style="margin-top:auto;"><i class="ph ph-download-simple"></i> Guardar en Biblioteca</button>
            `;

            const btnBajar = tarjetaBusqueda.querySelector('.btn-descargar');

            // Evento de descarga con el Proxy para saltar el bloqueo CORS
            // Evento de descarga blindado
            btnBajar.addEventListener('click', async (e) => {
                e.stopPropagation();

                // Damos feedback visual
                btnBajar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Bajando...';
                btnBajar.style.pointerEvents = 'none'; // Bloqueamos el botón para evitar doble clic

                try {
                    // 1. Cambiamos a corsproxy.io, que es mucho mejor para descargar archivos reales (EPUBs)
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(linkEpub)}`;

                    // 2. Intentamos la descarga
                    const respuestaDescarga = await fetch(proxyUrl);

                    // BARRERA DE SEGURIDAD 1: Si Gutenberg nos tira error 400 o 404, cortamos todo acá.
                    if (!respuestaDescarga.ok) {
                        throw new Error("Gutenberg bloqueó la conexión.");
                    }

                    const blobDelLibro = await respuestaDescarga.blob();

                    // BARRERA DE SEGURIDAD 2: Si el archivo pesa menos de 1000 bytes, es un texto de error disfrazado.
                    if (blobDelLibro.size < 1000) {
                        throw new Error("El archivo descargado está corrupto o vacío.");
                    }

                    // 3. Si pasamos las barreras, creamos el archivo fantasma
                    const urlLocalFantasma = URL.createObjectURL(blobDelLibro);

                    // 4. Armamos objeto libro
                    const nuevoLibro = {
                        id: `gutenberg-${libroAPI.id}`,
                        titulo: libroAPI.title,
                        autor: autorNombre,
                        año: "N/A",
                        archivo: urlLocalFantasma,
                        progreso: 0
                    };

                    // 5. Guardamos y actualizamos la UI con seguridad
                    misLibros.unshift(nuevoLibro);
                    armarTarjetas('grid-home', misLibros.slice(0, 4));
                    armarTarjetas('grid-library', misLibros);

                    // Éxito visual
                    btnBajar.innerHTML = '<i class="ph ph-check"></i> En Biblioteca';
                    btnBajar.style.color = "var(--accent)";

                } catch (error) {
                    console.error("Fallo la descarga blindada:", error);
                    // Si falla, le avisamos al usuario pero NO rompemos la grilla
                    btnBajar.innerHTML = '<i class="ph ph-warning"></i> Error';
                    btnBajar.style.color = "#FF4444";
                    btnBajar.style.pointerEvents = 'auto'; // Le permitimos volver a intentar
                }
            });

            // <-- ESTO TE FALTABA COPIAR: Inyecta la tarjeta armada en el HTML
            contenedorResultados.appendChild(tarjetaBusqueda);

        }); // <-- ACÁ CIERRA EL FOREACH DE LOS LIBROS

    } catch (error) { // <-- ESTO FALTABA COPIAR: Atrapa el error si se cae internet
        contenedorResultados.innerHTML = '<p style="color:red; width:100%; text-align:center;">Error de conexión con la API.</p>';}
} // <-- ACÁ CIERRA LA FUNCIÓN PRINCIPAL
// ==========================================
// 4. OVERLAYS Y LECTOR
// ==========================================
async function abrirOverlayInfo(elLibro, fotoPortada) {
    const ventanaOverlay = document.getElementById('overlay-info');
    ventanaOverlay.classList.add('active');

    document.getElementById('detail-portada').src = fotoPortada;
    document.getElementById('detail-titulo').innerText = elLibro.titulo;
    document.getElementById('detail-autor').innerText = elLibro.autor;
    document.getElementById('detail-sinopsis').innerHTML = '<p>Cargando datos...</p>';

    const botonLeer = document.getElementById('btn-iniciar-lectura');
    const nuevoBotonLeer = botonLeer.cloneNode(true);
    botonLeer.parentNode.replaceChild(nuevoBotonLeer, botonLeer);

    nuevoBotonLeer.addEventListener('click', () => {
        ventanaOverlay.classList.remove('active');
        prenderPantalla('reader');
        arrancarMotorDeLectura(elLibro);
    });

    try {
        const libroTemporal = ePub(elLibro.archivo);
        await libroTemporal.ready;
        const metadata = await libroTemporal.loaded.metadata;
        document.getElementById('detail-sinopsis').innerHTML = metadata.description || '<p>Metadata sin sinopsis.</p>';
    } catch (error) {
        document.getElementById('detail-sinopsis').innerHTML = '<p>Error al leer metadata.</p>';
    }
}

function arrancarMotorDeLectura(elLibro) {
    const visor = document.getElementById('visor-libro');
    visor.innerHTML = '';

    const libroFisico = ePub(elLibro.archivo);

    lectorAbierto = libroFisico.renderTo(visor, {
        width: '100%',
        height: '100%',
        flow: 'paginated'
    });

    // Forzamos estilos limpios
    lectorAbierto.hooks.content.register((contents) => {
        contents.addStylesheetRules({
            "body": { "color": "#F5F5F7 !important", "background-color": "transparent !important" },
            "img": { "max-width": "100% !important" }
        });
    });

    lectorAbierto.display();
}

// Y FUERA de la función, agregamos los listeners una sola vez (al cargar la página)
document.addEventListener('DOMContentLoaded', () => {
    // ... (tu código anterior) ...

    // Agregamos los eventos a las zonas de clic
    document.getElementById('hit-prev').addEventListener('click', () => {
        if (lectorAbierto) lectorAbierto.prev();
    });
    document.getElementById('hit-next').addEventListener('click', () => {
        if (lectorAbierto) lectorAbierto.next();
    });
});


// ==========================================
// 5. INICIALIZACIÓN DE EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Carga inicial
    armarTarjetas('grid-home', misLibros.slice(0, 4));
    armarTarjetas('grid-library', misLibros);

    // Navegación principal
    document.querySelectorAll('[data-screen]').forEach(boton => {
        boton.addEventListener('click', function() {
            const destino = this.dataset.screen;
            prenderPantalla(destino);
            if (destino !== 'reader' && lectorAbierto) {
                lectorAbierto.destroy();
                lectorAbierto = null;
            }
        });
    });

    // Control del Modal API
    const modalSearch = document.getElementById('modal-search');
    const inputSearch = document.getElementById('searchInput');
    const langFilter = document.getElementById('langFilter');

    document.getElementById('btnAbrirBuscador').addEventListener('click', () => modalSearch.classList.add('active'));
    document.getElementById('closeSearchModal').addEventListener('click', () => modalSearch.classList.remove('active'));

    // Ejecutar búsqueda API
    document.getElementById('btnEjecutarBusqueda').addEventListener('click', () => {
        const busqueda = inputSearch.value.trim();
        const idioma = langFilter.value;
        if (busqueda !== "") buscarLibrosEnAPI(busqueda, idioma);
    });

    // Buscar con Enter
    inputSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') document.getElementById('btnEjecutarBusqueda').click();
    });

    // Control de Overlays genérico
    const overlays = ['.overlay-glassy', '.modal-overlay'];
    overlays.forEach(selector => {
        document.querySelectorAll(selector).forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('active');
            });
        });
    });

    document.getElementById('btnSettings').addEventListener('click', () => document.getElementById('modal-settings').classList.add('active'));
    document.getElementById('closeSettingsModal').addEventListener('click', () => document.getElementById('modal-settings').classList.remove('active'));
});