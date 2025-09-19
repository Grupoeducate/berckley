document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM Y VARIABLES GLOBALES ---
    const consultarBtn = document.getElementById('consultar-btn');
    let datosCompletos = []; // Almacenará todos los registros de notas
    let configNiveles = {};  // Almacenará la configuración de niveles y colores del JSON

    // Constantes para los nombres de las áreas (deben coincidir con el CSV)
    const NOMBRES_AREAS_CSV = [
        'LECTURA CRÍTICA',
        'MATEMÁTICAS',
        'CIENCIAS NATURALES',
        'SOCIALES Y CIUDADANAS',
        'INGLÉS'
    ];

    // Mapeo para conectar los nombres del CSV con las claves del archivo JSON
    const MAPEO_AREAS_JSON = {
        'LECTURA CRÍTICA': 'Lenguaje',
        'MATEMÁTICAS': 'matematicas',
        'CIENCIAS NATURALES': 'ciencias_naturales',
        'SOCIALES Y CIUDADANAS': 'sociales_ciudadanas',
        'INGLÉS': 'ingles'
    };

    // --- FUNCIONES AUXILIARES ---

    /**
     * Devuelve el ciclo académico correspondiente a un grado.
     * @param {number} grado - El número del grado (ej: 5).
     * @returns {string} El ciclo correspondiente (ej: "Ciclo-II").
     */
    function obtenerCiclo(grado) {
        if (grado >= 1 && grado <= 3) return 'Ciclo-I';
        if (grado >= 4 && grado <= 5) return 'Ciclo-II';
        if (grado >= 6 && grado <= 7) return 'Ciclo-III';
        if (grado >= 8 && grado <= 9) return 'Ciclo-IV';
        if (grado >= 10 && grado <= 11) return 'Ciclo-V';
        return 'N/A';
    }

    /**
     * Busca en la configuración JSON el nivel y color para una nota específica en un área.
     * @param {string} area - El nombre del área (del CSV, ej: 'MATEMÁTICAS').
     * @param {number} nota - La nota a evaluar.
     * @returns {object} Un objeto con el nivel y el color.
     */
    function getNivelInfo(area, nota) {
        const nombreJson = MAPEO_AREAS_JSON[area] || 'puntaje_global';
        const niveles = configNiveles[nombreJson];

        if (!niveles) return { nivel: "N/A", color: '#cccccc' }; // Color gris por defecto

        for (const nivel of niveles) {
            if (nota >= nivel.min && nota <= nivel.max) {
                return nivel; // Devuelve el objeto completo {nivel, min, max, color}
            }
        }
        return { nivel: "N/A", color: '#cccccc' };
    }


    // --- LÓGICA PRINCIPAL DE CARGA Y PROCESAMIENTO ---

    /**
     * Carga el JSON de configuración y los archivos CSV, los procesa y prepara la aplicación.
     */
    async function cargarDatos() {
        try {
            // 1. Cargar el JSON de configuración
            const responseNiveles = await fetch('niveles.json');
            if (!responseNiveles.ok) throw new Error('No se pudo cargar niveles.json');
            configNiveles = await responseNiveles.json();
            console.log("Configuración de niveles cargada exitosamente.");

            // 2. Cargar los archivos CSV
            const archivos = ['Consolidado_2023-2024.csv', 'Consolidado_2024-2025.csv'];
            let datosTransformados = [];

            for (const archivo of archivos) {
                try {
                    const response = await fetch(archivo);
                    if (response.ok) {
                        const csvText = await response.text();
                        const csvSinComas = csvText.replace(/,/g, '.'); // Reemplaza comas decimales
                        const data = Papa.parse(csvSinComas, {
                            header: true,
                            delimiter: ";",
                            dynamicTyping: true,
                            skipEmptyLines: true
                        }).data;
                        
                        // Transformar datos de formato "ancho" a "largo"
                        data.forEach(fila => {
                            if (fila.grado) {
                                NOMBRES_AREAS_CSV.forEach(area => {
                                    if (fila[area] !== undefined) {
                                        datosTransformados.push({
                                            calendario: fila.Calandario,
                                            prueba: fila.prueba,
                                            grado: fila.grado,
                                            grupo: fila.grupo,
                                            ciclo: obtenerCiclo(fila.grado),
                                            estudiante: fila.Estudiante,
                                            area: area,
                                            nota: parseFloat(fila[area]) || 0
                                        });
                                    }
                                });
                            }
                        });
                        console.log(`Archivo "${archivo}" procesado.`);
                    }
                } catch (error) {
                    console.warn(`No se pudo cargar o procesar el archivo "${archivo}". Se omitirá.`);
                }
            }
            datosCompletos = datosTransformados;
            console.log(`Procesamiento finalizado. Total de registros: ${datosCompletos.length}`);
            poblarFiltros();
        } catch (error) {
            console.error("Error crítico al cargar los datos iniciales:", error);
            alert("No se pudo cargar la configuración inicial. Por favor, revise la consola para más detalles.");
        }
    }

    /**
     * Rellena los menús desplegables (selects) con valores únicos del conjunto de datos.
     */
    function poblarFiltros() {
        if (datosCompletos.length === 0) return;

        const pruebas = [...new Set(datosCompletos.map(d => d.prueba))].sort();
        const grados = [...new Set(datosCompletos.map(d => d.grado))].sort((a, b) => a - b);
        const areas = [...new Set(datosCompletos.map(d => d.area))].sort();

        const pruebaSelect = document.getElementById('prueba');
        pruebas.forEach(p => pruebaSelect.add(new Option(p, p)));

        const gradoSelect = document.getElementById('grado');
        grados.forEach(g => gradoSelect.add(new Option(`Grado ${g}`, g)));

        const areaSelect = document.getElementById('area');
        areas.forEach(a => areaSelect.add(new Option(a, a)));
    }


    // --- MANEJO DE EVENTOS Y GENERACIÓN DE VISUALIZACIONES ---

    consultarBtn.addEventListener('click', () => {
        // Limpiar resultados anteriores
        document.getElementById('graficos-container').innerHTML = '';
        document.getElementById('tabla-estudiantes-body').innerHTML = '';

        // Obtener valores de los filtros
        const calendario = document.getElementById('calendario').value;
        const prueba = document.getElementById('prueba').value;
        const ciclo = document.getElementById('ciclo').value;
        const grado = document.getElementById('grado').value;
        const area = document.getElementById('area').value;

        // Filtrar el conjunto de datos principal
        const datosFiltrados = datosCompletos.filter(item => 
            (!calendario || item.calendario === calendario) &&
            (prueba === 'todos' || item.prueba === prueba) &&
            (ciclo === 'todos' || item.ciclo === ciclo) &&
            (grado === 'todos' || item.grado.toString() === grado) &&
            (area === 'todas' || item.area === area)
        );

        if (datosFiltrados.length === 0) {
            document.getElementById('graficos-container').innerHTML = '<p>No se encontraron resultados para esta consulta.</p>';
            return;
        }

        // Generar las visualizaciones con los datos filtrados
        generarGraficoPromedioPor('Promedio General por Área', datosFiltrados, 'area');
        if (grado === 'todos') {
            generarGraficoPromedioPor('Promedio General por Grado', datosFiltrados, 'grado');
        } else {
            generarGraficoPromedioPor(`Promedio por Grupo - Grado ${grado}`, datosFiltrados, 'grupo');
        }
        mostrarTablaEstudiantes(datosFiltrados);
    });

    /**
     * Calcula promedios y prepara los datos para un gráfico de barras.
     * @param {string} titulo - Título del gráfico.
     * @param {Array} datos - El conjunto de datos filtrado.
     * @param {string} agruparPor - La propiedad por la cual agrupar (ej: 'area', 'grado').
     */
    function generarGraficoPromedioPor(titulo, datos, agruparPor) {
        const grupos = {};
        datos.forEach(dato => {
            const clave = dato[agruparPor];
            if (!clave) return;
            if (!grupos[clave]) grupos[clave] = { suma: 0, contador: 0 };
            if (!isNaN(dato.nota)) {
                grupos[clave].suma += dato.nota;
                grupos[clave].contador++;
            }
        });

        const labels = Object.keys(grupos).sort();
        const promedios = labels.map(clave => (grupos[clave].contador > 0 ? (grupos[clave].suma / grupos[clave].contador) : 0));
        
        const coloresBarras = promedios.map((prom, index) => {
            const areaParaColor = (agruparPor === 'area') ? labels[index] : 'puntaje_global';
            return getNivelInfo(areaParaColor, prom).color;
        });

        if (labels.length > 0) {
            generarElementoGrafico(titulo, labels, promedios, coloresBarras);
        }
    }

    /**
     * Renderiza un gráfico de Chart.js en la página.
     * @param {string} titulo - Título del gráfico.
     * @param {Array} labels - Etiquetas para el eje X.
     * @param {Array} data - Valores numéricos para las barras.
     * @param {Array} colores - Colores para cada una de las barras.
     */
    function generarElementoGrafico(titulo, labels, data, colores) {
        const container = document.getElementById('graficos-container');
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'grafico-wrapper';
        const tituloEl = document.createElement('h4');
        tituloEl.innerText = titulo;
        const canvas = document.createElement('canvas');
        canvasContainer.appendChild(tituloEl);
        canvasContainer.appendChild(canvas);
        container.appendChild(canvasContainer);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Promedio de Notas',
                    data: data.map(d => d.toFixed(2)),
                    backgroundColor: colores,
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                scales: { y: { beginAtZero: true, suggestedMax: 5.0 } },
                plugins: { legend: { display: false } }
            }
        });
    }
    
    /**
     * Construye y muestra la tabla HTML con el detalle de los estudiantes.
     * @param {Array} datos - El conjunto de datos filtrado.
     */
    function mostrarTablaEstudiantes(datos) {
        const tbody = document.getElementById('tabla-estudiantes-body');
        const estudiantes = {};
        
        // Re-agrupar los datos por estudiante para tener una sola fila por cada uno
        datos.forEach(dato => {
            if (!estudiantes[dato.estudiante]) {
                estudiantes[dato.estudiante] = { grupo: dato.grupo };
            }
            estudiantes[dato.estudiante][dato.area] = dato.nota;
        });

        for (const nombreEstudiante in estudiantes) {
            const datosEstudiante = estudiantes[nombreEstudiante];
            const tr = document.createElement('tr');
            
            // Celda para nombre y grupo
            tr.innerHTML = `<td>${nombreEstudiante}</td><td>${datosEstudiante.grupo || 'N/A'}</td>`;
            
            // Crear celdas de notas con su color de fondo
            NOMBRES_AREAS_CSV.forEach(area => {
                const nota = datosEstudiante[area] || 0;
                const nivel = getNivelInfo(area, nota);
                const td = document.createElement('td');
                td.className = 'celda-nota';
                td.innerText = nota.toFixed(2).replace('.',',');
                td.style.backgroundColor = nivel.color;
                td.style.color = 'white'; // Texto blanco para alto contraste
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
    }

    // --- INICIO DE LA APLICACIÓN ---
    cargarDatos();
});
