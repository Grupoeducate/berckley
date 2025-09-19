document.addEventListener('DOMContentLoaded', () => {
    const consultarBtn = document.getElementById('consultar-btn');
    let datosCompletos = []; // Almacenará los datos ya transformados y listos para usar

    // Nombres exactos de las columnas de asignaturas en tu CSV
    const NOMBRES_AREAS = [
        'LECTURA CRÍTICA',
        'MATEMÁTICAS',
        'CIENCIAS NATURALES',
        'SOCIALES Y CIUDADANAS',
        'INGLÉS'
    ];

    // Función para asignar el ciclo basado en el grado
    function obtenerCiclo(grado) {
        if (grado >= 1 && grado <= 3) return 'Ciclo-I';
        if (grado >= 4 && grado <= 5) return 'Ciclo-II';
        if (grado >= 6 && grado <= 7) return 'Ciclo-III';
        if (grado >= 8 && grado <= 9) return 'Ciclo-IV';
        if (grado >= 10 && grado <= 11) return 'Ciclo-V';
        return 'N/A';
    }

    // Cargar y procesar los datos de todos los archivos CSV
    async function cargarDatos() {
        const archivos = [
            'Consolidado_2023-2024.csv'
            //'Consolidado_2024-2025.csv' // Cuando exista este archivo, lo cargará
        ];
        let datosTransformados = [];

        await Promise.all(archivos.map(async (archivo) => {
            try {
                const response = await fetch(archivo);
                if (response.ok) {
                    console.log(`Archivo cargado exitosamente: ${archivo}`);
                    let csvText = await response.text();
                    csvText = csvText.replace(/,/g, '.'); // Reemplaza comas decimales por puntos

                    const data = Papa.parse(csvText, {
                        header: true,
                        delimiter: ";",
                        dynamicTyping: true,
                        skipEmptyLines: true
                    }).data;
                    
                    // Transformación de formato "ancho" a "largo"
                    data.forEach(fila => {
                        if (!fila.grado) return; // Omitir filas inválidas
                        NOMBRES_AREAS.forEach(area => {
                            if (fila[area] !== undefined) { // Asegurarse que la columna de área existe
                                datosTransformados.push({
                                    calendario: fila.Calandario,
                                    prueba: fila.prueba,
                                    grado: fila.grado,
                                    grupo: fila.grupo,
                                    ciclo: obtenerCiclo(fila.grado),
                                    estudiante: fila.Estudiante,
                                    area: area,
                                    nota: fila[area]
                                });
                            }
                        });
                    });
                } else {
                    console.warn(`No se pudo cargar el archivo: ${archivo}. Se omitirá.`);
                }
            } catch (error) {
                console.error(`Error al procesar el archivo ${archivo}:`, error);
            }
        }));

        datosCompletos = datosTransformados;
        console.log("Total de registros procesados:", datosCompletos.length);
        poblarFiltros();
    }

    // Rellena los menús desplegables con los datos cargados
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

    // Evento al hacer clic en el botón "Consultar"
    consultarBtn.addEventListener('click', () => {
        document.getElementById('graficos-container').innerHTML = '';

        const calendario = document.getElementById('calendario').value;
        const prueba = document.getElementById('prueba').value;
        const ciclo = document.getElementById('ciclo').value;
        const grado = document.getElementById('grado').value;
        const area = document.getElementById('area').value;

        let datosFiltrados = datosCompletos.filter(item => {
            if (calendario && item.calendario !== calendario) return false;
            if (prueba !== 'todos' && item.prueba !== prueba) return false;
            if (ciclo !== 'todos' && item.ciclo !== ciclo) return false;
            if (grado !== 'todos' && item.grado.toString() !== grado) return false;
            if (area !== 'todas' && item.area !== area) return false;
            return true;
        });

        if (datosFiltrados.length === 0) {
            document.getElementById('graficos-container').innerHTML = '<p>No se encontraron resultados para esta consulta.</p>';
            return;
        }

        // Genera los gráficos que sean relevantes para la consulta
        generarGraficoPromedioPor('Promedio General por Área', datosFiltrados, 'area');
        if (grado === 'todos') {
            generarGraficoPromedioPor('Promedio General por Grado', datosFiltrados, 'grado');
        }
         if (grado !== 'todos') {
            generarGraficoPromedioPor(`Promedio por Grupo - Grado ${grado}`, datosFiltrados, 'grupo');
        }
    });

    // Función genérica para calcular promedios y preparar datos para un gráfico
    function generarGraficoPromedioPor(titulo, datos, agruparPor) {
        const grupos = {};
        datos.forEach(dato => {
            const clave = dato[agruparPor];
            if (!clave) return;

            if (!grupos[clave]) {
                grupos[clave] = { suma: 0, contador: 0 };
            }
            const notaNum = parseFloat(dato.nota);
            if (!isNaN(notaNum)) {
                grupos[clave].suma += notaNum;
                grupos[clave].contador++;
            }
        });

        const labels = Object.keys(grupos).sort();
        const data = labels.map(clave => {
            return grupos[clave].contador > 0 ? (grupos[clave].suma / grupos[clave].contador).toFixed(2) : 0;
        });

        if (labels.length > 0) {
            generarElementoGrafico(titulo, labels, data);
        }
    }

    // Función que crea el elemento canvas y renderiza el gráfico en la página
    function generarElementoGrafico(titulo, labels, data) {
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
                    data: data,
                    backgroundColor: 'rgba(0, 51, 102, 0.7)',
                    borderColor: 'rgba(0, 51, 102, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 5.0
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Iniciar la carga de datos al abrir la página
    cargarDatos();

});
